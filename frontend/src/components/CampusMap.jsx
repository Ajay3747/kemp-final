import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Don't forget to import the CSS
import L from 'leaflet'; // Import Leaflet itself
import { LocateFixed } from 'lucide-react';
import {
  CAMPUS_CENTER,
  CAMPUS_BOUNDARY_RADIUS_METERS,
  CAMPUS_MAP_VIEW_RADIUS_METERS,
  CAMPUS_DEFAULT_ZOOM,
  CAMPUS_MIN_ZOOM,
  CAMPUS_MAX_ZOOM,
  CAMPUS_FEATURES,
  MAPBOX_TOKEN,
  MAPBOX_STYLE_ID
} from '../config/campus';

// Mapbox gives higher-detail imagery and more reliable tile loading than
// plain OSM; falls back to OSM's free/keyless tiles when no token is
// configured so the map still works out of the box. tileSize/zoomOffset are
// Mapbox's documented values for its raster tile endpoint under Leaflet.
const TILE_CONFIG = MAPBOX_TOKEN
  ? {
    url: `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE_ID}/tiles/{z}/{x}/{y}{r}?access_token=${MAPBOX_TOKEN}`,
    attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    tileSize: 512,
    zoomOffset: -1
  }
  : {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    // Leaflet's own TileLayer defaults — spelled out explicitly because
    // react-leaflet passes tileSize/zoomOffset={undefined} through to
    // Leaflet's option merge, which overwrites its internal defaults with
    // undefined and breaks tile-size math (Leaflet throws "Attempted to
    // load an infinite number of tiles").
    tileSize: 256,
    zoomOffset: 0
  };

// GPS/WiFi-based location is inherently imprecise (often 20-100m+ on a
// laptop with no GPS chip) — that's a hardware/OS limitation no web app can
// fix. Rather than showing a single dot as if it were pinpoint-exact, we
// draw the browser-reported accuracy radius so "why is it slightly off"
// is self-explanatory. Ignore sub-2m jitter between updates so the marker
// doesn't visibly twitch from GPS noise while genuinely standing still.
const MIN_MOVEMENT_METERS = 2;

// Fix for default icon not showing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// A small pulsing dot rather than the default pin — visually distinct from
// the campus/facility markers so "this is you" is unambiguous at a glance.
const youAreHereIcon = L.divIcon({
  className: 'kemp-you-are-here-marker',
  html: '<span style="display:block;width:16px;height:16px;border-radius:9999px;background:#facc15;border:3px solid #000;box-shadow:0 0 0 6px rgba(250,204,21,0.35);"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const featureIcon = (icon) => L.divIcon({
  className: 'kemp-feature-marker',
  html: `<span style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:#111827;border:2px solid #facc15;font-size:16px;">${icon || '📍'}</span>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

// Haversine distance in meters between two lat/lng points.
function distanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// react-leaflet v4 doesn't reliably hand back the Leaflet map instance via a
// plain ref on MapContainer — the supported way to reach it is this hook
// from inside the tree. Renders nothing; just reports the instance up.
function MapInstanceReporter({ onReady }) {
  const map = useMap();
  useEffect(() => {
    onReady(map);
  }, [map, onReady]);
  return null;
}

const CampusMap = () => {
  const center = [CAMPUS_CENTER.lat, CAMPUS_CENTER.lng];
  const maxBounds = L.latLng(CAMPUS_CENTER.lat, CAMPUS_CENTER.lng).toBounds(CAMPUS_MAP_VIEW_RADIUS_METERS * 2);

  const [mapInstance, setMapInstance] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  // 'idle' | 'locating' | 'granted' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'
  const [locationStatus, setLocationStatus] = useState('idle');
  const watchIdRef = useRef(null);

  // Live location is entirely client-side: it's only ever read from the
  // browser's geolocation API into this component's own state and never
  // sent to the backend or any other user — so no other user can ever see it.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }

    setLocationStatus('locating');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocationStatus('granted');
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setUserPosition((prev) => {
          if (prev && distanceInMeters(prev.lat, prev.lng, next.lat, next.lng) < MIN_MOVEMENT_METERS) {
            // Position barely changed — still take the fresher accuracy
            // reading, but don't jitter the marker for sub-2m GPS noise.
            return { ...prev, accuracy: next.accuracy };
          }
          return next;
        });
      },
      (error) => {
        // watchPosition's error callback fires for permission denial, a
        // failed fix (no GPS/network signal), and a timed-out attempt —
        // three different situations that need three different messages,
        // not one blanket "unsupported".
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus('denied');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationStatus('unavailable');
        } else if (error.code === error.TIMEOUT) {
          setLocationStatus('timeout');
        } else {
          setLocationStatus('unsupported');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const distanceFromCenter = userPosition
    ? distanceInMeters(userPosition.lat, userPosition.lng, CAMPUS_CENTER.lat, CAMPUS_CENTER.lng)
    : null;
  const isInsideCampus = distanceFromCenter !== null ? distanceFromCenter <= CAMPUS_BOUNDARY_RADIUS_METERS : null;

  const handleMyLocation = () => {
    if (!mapInstance) return;
    if (userPosition) {
      mapInstance.flyTo([userPosition.lat, userPosition.lng], CAMPUS_DEFAULT_ZOOM);
    }
  };

  let statusMessage = null;
  if (locationStatus === 'locating') {
    statusMessage = { text: '📍 Locating you…', tone: 'neutral' };
  } else if (locationStatus === 'denied') {
    statusMessage = { text: 'Location permission denied — enable it in your browser settings to see your position.', tone: 'warn' };
  } else if (locationStatus === 'unavailable') {
    statusMessage = { text: "Couldn't get a location fix — check that GPS/location services are turned on.", tone: 'warn' };
  } else if (locationStatus === 'timeout') {
    statusMessage = { text: 'Location request timed out — check your signal and try again.', tone: 'warn' };
  } else if (locationStatus === 'unsupported') {
    statusMessage = { text: 'Live location isn\'t supported on this device/browser.', tone: 'warn' };
  } else if (locationStatus === 'granted' && isInsideCampus !== null) {
    statusMessage = isInsideCampus
      ? { text: 'You are inside the campus', tone: 'good' }
      : { text: 'You are outside the campus', tone: 'warn' };
  }

  // Solid (not translucent) backgrounds — the OSM basemap underneath is
  // light-colored, so a translucent pill loses contrast against it.
  const statusStyles = {
    neutral: 'bg-gray-900 border-white/20 text-white',
    good: 'bg-gray-900 border-green-400/60 text-green-300',
    warn: 'bg-gray-900 border-yellow-400/60 text-yellow-300'
  };

  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400">
      <MapContainer
        center={center}
        zoom={CAMPUS_DEFAULT_ZOOM}
        minZoom={CAMPUS_MIN_ZOOM}
        maxZoom={CAMPUS_MAX_ZOOM}
        maxBounds={maxBounds}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <MapInstanceReporter onReady={setMapInstance} />
        <TileLayer
          attribution={TILE_CONFIG.attribution}
          url={TILE_CONFIG.url}
          tileSize={TILE_CONFIG.tileSize}
          zoomOffset={TILE_CONFIG.zoomOffset}
        />

        <Marker position={center}>
          <Popup>
            Kongu Engineering College <br /> Campus Center
          </Popup>
        </Marker>

        {CAMPUS_FEATURES.map((feature) => (
          <Marker
            key={feature.id}
            position={[feature.lat, feature.lng]}
            icon={featureIcon(feature.icon)}
          >
            <Popup>
              <strong>{feature.icon} {feature.name}</strong>
              {feature.description && <div>{feature.description}</div>}
            </Popup>
          </Marker>
        ))}

        {userPosition && (
          <>
            {userPosition.accuracy > 0 && (
              <Circle
                center={[userPosition.lat, userPosition.lng]}
                radius={userPosition.accuracy}
                pathOptions={{ color: '#facc15', weight: 1, fillColor: '#facc15', fillOpacity: 0.12 }}
              />
            )}
            <Marker position={[userPosition.lat, userPosition.lng]} icon={youAreHereIcon}>
              <Popup>
                You Are Here
                {userPosition.accuracy ? <><br />Accurate to ~{Math.round(userPosition.accuracy)}m</> : null}
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {statusMessage && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-1.5 rounded-full border text-xs font-semibold shadow-lg ${statusStyles[statusMessage.tone]}`}>
          {statusMessage.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleMyLocation}
        disabled={!userPosition}
        aria-label="Center map on my location"
        className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 px-3 py-2 bg-yellow-400 text-black font-semibold rounded-full shadow-lg hover:scale-105 transition-transform duration-200 disabled:opacity-50 disabled:hover:scale-100"
      >
        <LocateFixed size={18} /> My Location
      </button>
    </div>
  );
};

export default CampusMap;
