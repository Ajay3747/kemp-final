import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Don't forget to import the CSS
import L from 'leaflet'; // Import Leaflet itself

// Fix for default icon not showing
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const CampusMap = () => {
  const position = [11.271841, 77.604938]; // Coordinates from your OpenStreetMap link

  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden shadow-lg border-2 border-yellow-400">
      <MapContainer center={position} zoom={17} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>
              kemp <br /> is here!
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default CampusMap;