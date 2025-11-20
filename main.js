// ====== WebSocket ======
const socket = new WebSocket("wss://esp32-dashboard-1.onrender.com");

// ====== Leaflet Map & Routing Setup ======
let map, marker, routeControl;
let currentPos = [17.3297, 76.8343]; // default
let hospitalPos = null;
let tileLayers = {};
let currentTile = 'osm';

function initMap() {
  map = L.map('leafletMap').setView(currentPos, 15);

  // Base layers
  tileLayers['osm'] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  tileLayers['satellite'] = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: 'Tiles &copy; Esri' }
  );

  tileLayers['hybrid'] = L.layerGroup([
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri' }
    ),
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' })
  ]);

  // Marker for ambulance
  marker = L.marker(currentPos).addTo(map).bindPopup("Ambulance").openPopup();
}

// Switch map tiles
function setMapType(type) {
  if (map && tileLayers[type]) {
    map.eachLayer(l => map.removeLayer(l));
    if (type === 'hybrid') tileLayers[type].addTo(map);
    else tileLayers[type].addTo(map);
    marker.addTo(map);
    if (routeControl) routeControl.addTo(map);
    currentTile = type;
  }
}

// ====== WebSocket Incoming Data ======
socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Update ambulance location
  if (data.lat && data.lng && marker) {
    currentPos = [data.lat, data.lng];
    marker.setLatLng(currentPos);
    map.setView(currentPos);
    document.getElementById("gpsStatus").innerText = "📍 GPS Signal Active";

    // Update route if hospital selected
    if (hospitalPos) updateRoute(currentPos, hospitalPos);
  }

  // Receive hospital selection from doctor
  if (data.type === "hospitalSelect") {
    hospitalPos = [data.lat, data.lng];
    document.getElementById("hospitalName").innerText = `Destination: ${data.name}`;
    updateRoute(currentPos, hospitalPos);
  }
};

// ====== Routing ======
function updateRoute(start, end) {
  if (routeControl) map.removeControl(routeControl);

  routeControl = L.Routing.control({
    waypoints: [
      L.latLng(start[0], start[1]),
      L.latLng(end[0], end[1])
    ],
    routeWhileDragging: false,
    show: false,
    lineOptions: { styles: [{ color: 'blue', opacity: 0.7, weight: 5 }] },
    createMarker: () => null // Do not create extra markers
  }).addTo(map);
}

// ====== Initialize Map ======
window.onload = () => initMap();

// ====== WebSocket Errors ======
socket.onerror = () => console.error("WebSocket Error");
socket.onclose = () => console.warn("WebSocket closed");
