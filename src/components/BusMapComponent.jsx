// components/BusMapComponent.jsx (No changes needed)
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

// Fix marker icon issue in Leaflet (default markers won't show otherwise)
import "leaflet/dist/leaflet.css";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png  ",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png  ",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png  ",
});

// Helper component to fit map bounds dynamically
function FitMapBounds({ stops, vehicleLocation }) {
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

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, stops, vehicleLocation]);

  return null;
}

// Custom icon for the bus
const busIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61449.png  ",
  iconSize: [32, 32],
});

const BusMapComponent = ({ stops = [], vehicleLocation = null }) => {
  // Default center (London-ish)
  const defaultCenter = [51.5074, -0.1278];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "10px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/  ">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Plot all stops */}
      {stops.map((stop, i) => (
        <Marker key={i} position={[stop.lat, stop.lng]}>
          <Popup>
            <strong>{stop.stopName}</strong>
            <br />
            ({stop.lat.toFixed(5)}, {stop.lng.toFixed(5)})
          </Popup>
        </Marker>
      ))}

      {/* Bus marker - positioned at the NEXT stop */}
      {vehicleLocation && (
        <Marker
          position={[vehicleLocation.lat, vehicleLocation.lng]}
          icon={busIcon}
        >
          <Popup>
            🚌 <strong>Bus is heading here!</strong>
            <br />
            ({vehicleLocation.lat.toFixed(5)}, {vehicleLocation.lng.toFixed(5)})
          </Popup>
        </Marker>
      )}

      {/* Automatically adjust map to show everything */}
      <FitMapBounds stops={stops} vehicleLocation={vehicleLocation} />
    </MapContainer>
  );
};

export default BusMapComponent;