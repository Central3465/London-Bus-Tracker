import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

const BusMap = ({ selectedStop }) => {
  if (!selectedStop?.lat || !selectedStop?.lon) return null;

  const position = [selectedStop.lat, selectedStop.lon];

  const busIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61168.png",
    iconSize: [30, 30],
  });

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={position}
        zoom={16}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        <Marker position={position} icon={busIcon}>
          <Popup>
            <strong>{selectedStop.commonName}</strong>
            <br />
            {selectedStop.indicator}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default BusMap;