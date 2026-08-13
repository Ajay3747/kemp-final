// Single source of truth for the campus map's geography. Coordinates here
// come from the college's existing OpenStreetMap link (previously hardcoded
// directly inside CampusMap.jsx) — update this file, not the component, when
// more accurate values become available.

// Center of the Kongu Engineering College campus.
export const CAMPUS_CENTER = { lat: 11.271841, lng: 77.604938 };

// "Inside campus" is approximated as within this many meters of the center,
// since no actual campus perimeter/boundary is defined anywhere in the
// project yet. Tune this once the real campus extent is known.
export const CAMPUS_BOUNDARY_RADIUS_METERS = 300;

// How far the map is allowed to pan away from the center — deliberately
// wider than the boundary radius above (which is only used for the "inside
// campus" check) so the campus and its immediate surroundings stay visible
// without the view ever drifting to city/world level.
export const CAMPUS_MAP_VIEW_RADIUS_METERS = 800;

// Zoom levels tuned so the map opens on the campus and can't be zoomed out
// to city/world level.
export const CAMPUS_DEFAULT_ZOOM = 17;
export const CAMPUS_MIN_ZOOM = 15;
export const CAMPUS_MAX_ZOOM = 19;

// Real facility coordinates (Library, Canteen, ATM, etc.) aren't available
// yet — add entries here once they are: { id, name, icon, lat, lng,
// description }. CampusMap.jsx already renders whatever is in this list, so
// dropping in real entries later needs no component changes.
export const CAMPUS_FEATURES = [];

// Tile provider: Mapbox (higher-detail streets imagery, more reliable tile
// loading) when a token is configured, falling back to OpenStreetMap's
// free/keyless tiles otherwise so the map still works before Mapbox is set
// up. Get a free token at https://account.mapbox.com/access-tokens/ (free
// tier: 50,000 map loads/month) and put it in frontend/.env as
// VITE_MAPBOX_TOKEN=pk.xxxxx — see frontend/.env.example.
export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
export const MAPBOX_STYLE_ID = 'streets-v12';
