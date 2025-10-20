// components/BusMapComponent.jsx
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";

// Fix marker icon issue in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const busStopIcon = new L.DivIcon({
  className: "custom-icon",
  html: `<div style="
    background-color: #1e40af; 
    width: 24px; 
    height: 24px; 
    border-radius: 50%; 
    border: 2px solid white; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
  "><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.5-10 12-10 12S2 17.5 2 12A10 10 0 0 1 12 2Z"/><circle cx="12" cy="12" r="3"/></svg></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const busIcon = new L.DivIcon({
  className: "custom-icon",
  html: `<div style="
    background-color: #dc2626; 
    width: 32px; 
    height: 32px; 
    border-radius: 50%; 
    border: 2px solid white; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
  "><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M4 12V8a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4m8-4v4m-8-4h8m-8 4h8m-8 4h8m-8 4h8M6 18h12a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2Z"/></svg></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const userIcon = new L.DivIcon({
  className: "custom-icon",
  html: `<div style="
    background-color: #3b82f6; 
    width: 28px; 
    height: 28px; 
    border-radius: 50%; 
    border: 2px solid white; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    box-shadow: 0 0 5px rgba(0,0,0,0.5);
  "><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Helper component to fit map bounds dynamically
function FitMapBounds({ stops, vehicleLocation, userLocation }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = [];
    if (stops && stops.length > 0) {
      stops.forEach((stop) => bounds.push([stop.lat, stop.lng]));
    }
    if (vehicleLocation) {
      bounds.push([vehicleLocation.lat, vehicleLocation.lng]);
    }
    if (userLocation) {
      bounds.push([userLocation.lat, userLocation.lng]);
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, stops, vehicleLocation, userLocation]);

  return null;
}

const BusMapComponent = ({ stops = [], vehicleLocation = null, userLocation = null }) => {
  // Default center (London-ish)
  const defaultCenter = [51.5074, -0.1278];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "10px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Plot all stops */}
      {stops.map((stop, i) => (
        <Marker key={i} position={[stop.lat, stop.lng]} icon={busStopIcon}>
          <Popup>
            <strong>{stop.stopName || stop.commonName || 'Bus Stop'}</strong>
            <br />
            ({stop.lat.toFixed(5)}, {stop.lng.toFixed(5)})
          </Popup>
        </Marker>
      ))}

      {/* Bus marker */}
      {vehicleLocation && (
        <Marker
          position={[vehicleLocation.lat, vehicleLocation.lng]}
          icon={busIcon}
        >
          <Popup>
            🚌 <strong>Bus</strong>
            <br />
            ({vehicleLocation.lat.toFixed(5)}, {vehicleLocation.lng.toFixed(5)})
          </Popup>
        </Marker>
      )}

      {/* User location marker */}
      {userLocation && (
        <Marker
          position={[userLocation.lat, userLocation.lng]}
          icon={userIcon}
        >
          <Popup>
            <strong>You are here</strong>
            <br />
            ({userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)})
          </Popup>
        </Marker>
      )}

      {/* Automatically adjust map to show everything */}
      <FitMapBounds stops={stops} vehicleLocation={vehicleLocation} userLocation={userLocation} />
    </MapContainer>
  );
};

export default BusMapComponent;