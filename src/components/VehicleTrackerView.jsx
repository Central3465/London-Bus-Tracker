// components/VehicleTrackerView.jsx (Updated to show the full scheduled route)
import React, { useState } from "react";
import {
  Bus,
  Navigation,
  MapPin,
  Clock,
  Info,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import BusMapComponent from "./BusMapComponent";

const VehicleTrackerView = ({
  vehicleIdInput,
  setVehicleIdInput,
  fetchVehicleDetails,
  BusMapComponent,
}) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeFormat, setTimeFormat] = useState("minutes"); // State for time format

  // Remove duplicates (unique by naptanId) - represents the full route
  const uniqueVehicleData = Array.isArray(vehicleData)
    ? vehicleData.filter(
        (v, i, self) => i === self.findIndex((t) => t.naptanId === v.naptanId)
      )
    : [];

  // Extract stops with coordinates for the map
  const stopLocations = Array.isArray(vehicleData)
    ? vehicleData
        .filter((s) => s.stopPoint && s.stopPoint.lat && s.stopPoint.lon)
        .map((s) => ({
          lat: s.stopPoint.lat,
          lng: s.stopPoint.lon,
          stopName: s.stopPoint.commonName || s.stopPoint.name || s.naptanId,
        }))
    : [];

  // Function to get the location of the NEXT STOP for the vehicle
  const getNextStopLocation = () => {
    if (
      !vehicleData ||
      !Array.isArray(vehicleData) ||
      vehicleData.length === 0
    ) {
      return null;
    }

    const nextStop = vehicleData[0]; // Assuming first item is the next stop
    if (
      nextStop &&
      nextStop.stopPoint &&
      typeof nextStop.stopPoint.lat === "number" &&
      typeof nextStop.stopPoint.lon === "number"
    ) {
      return {
        lat: nextStop.stopPoint.lat,
        lng: nextStop.stopPoint.lon,
      };
    }

    console.warn(
      "Coordinates for the next stop not found in the API response structure.",
      nextStop
    );
    return null;
  };

  const vehicleLocation = getNextStopLocation();

  // Function to format time based on the selected format
  const formatTime = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);

    if (timeFormat === "clock") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      // "minutes"
      const now = new Date();
      const arrivalTime = new Date(isoString);
      const diffMs = arrivalTime - now;
      const diffMins = Math.round(diffMs / 60000);

      if (diffMins < 0) {
        return `-${Math.abs(diffMins)} min ago`;
      } else if (diffMins === 0) {
        return "Due";
      } else {
        return `${diffMins} min`;
      }
    }
  };

  // Toggle time format
  const toggleTimeFormat = () => {
    setTimeFormat((prev) => (prev === "minutes" ? "clock" : "minutes"));
  };

  const resolveStopNames = async (arrivals) => {
    return await Promise.all(
      arrivals.map(async (arrival) => {
        if (arrival.stopPoint?.commonName) return arrival; // already has name
        try {
          const res = await fetch(
            `https://api.tfl.gov.uk/StopPoint/${arrival.naptanId}`
          );
          const stopData = await res.json();
          return {
            ...arrival,
            stopPoint: {
              ...arrival.stopPoint,
              commonName: stopData.commonName,
              lat: stopData.lat,
              lon: stopData.lon,
            },
          };
        } catch {
          return arrival;
        }
      })
    );
  };

  const handleFetchVehicle = async () => {
    if (!vehicleIdInput.trim()) {
      setError("Please enter a Vehicle ID");
      setVehicleData(null);
      return;
    }

    setError(null);
    setLoading(true);
    setVehicleData(null);

    try {
      const { error: fetchError, data } = await fetchVehicleDetails(
        vehicleIdInput.trim()
      );
      if (fetchError) {
        setError(fetchError);
        return;
      }

      if (!data || !Array.isArray(data)) {
        setError("No vehicle data found.");
        return;
      }

      // Enrich stop names BEFORE setting state
      const enrichedData = await resolveStopNames(data);
      setVehicleData(enrichedData);
    } catch (err) {
      console.error("Error in handleFetchVehicle:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Track a Specific Vehicle
      </h2>
      <p className="text-gray-600 mb-4">
        Enter the Vehicle ID (e.g., registration plate or fleet number) to track
        its live status and location.
      </p>

      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={vehicleIdInput}
          onChange={(e) => setVehicleIdInput(e.target.value)}
          placeholder="Enter Vehicle ID (e.g., AB12CDE)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleFetchVehicle}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Tracking..." : "Track Vehicle"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Fetching vehicle details...</p>
        </div>
      )}

      {/* Display Vehicle Details */}
      {vehicleData && !loading && !error && (
        <div className="space-y-4">
          {/* Vehicle Info Header */}
          {uniqueVehicleData.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
                  {uniqueVehicleData[0]?.lineName?.toUpperCase() || "N/A"}
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    To {uniqueVehicleData[0]?.destinationName || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Vehicle ID: {uniqueVehicleData[0]?.vehicleId || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time Format Toggle */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Time Format</span>
              <button
                onClick={toggleTimeFormat}
                className="flex items-center space-x-1 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {timeFormat === "minutes" ? (
                  <CalendarClock className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {timeFormat === "minutes"
                    ? "Switch to 18:00"
                    : "Switch to Minutes"}
                </span>
              </button>
            </div>
          </div>

          {/* Full Scheduled Route List (Full Route for the Vehicle) */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" /> Full Route
              Schedule
            </h3>

            {uniqueVehicleData.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {" "}
                {/* Added scrollable container */}
                {uniqueVehicleData.map((arrival, index) => (
                  <div
                    key={`${arrival.naptanId}-${index}`} // Use naptanId for uniqueness
                    className={`flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 ${
                      index === 0 ? "bg-blue-100" : "" // Highlight the first (next) stop
                    }`}
                  >
                    <span className="text-gray-700">
                      {arrival.stopPoint?.commonName ||
                        arrival.stopPoint?.name ||
                        arrival.naptanId ||
                        "Unknown Stop"}
                    </span>
                    <div className="flex space-x-3 text-sm">
                      <span className="text-gray-500">
                        Arr: {formatTime(arrival.expectedArrival) || "N/A"}
                      </span>
                      {/* Departure time might not be directly available from TfL Vehicle API, using arrival */}
                      {/* <span className="font-medium text-gray-600">
                        Dep: {formatTime(arrival.expectedDeparture) || "N/A"}
                      </span> */}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>No scheduled stops found for this vehicle ID.</p>
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" /> Live Map
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Showing all stops and the current position of the vehicle
              (approximated by its next scheduled stop).
            </p>
            <BusMapComponent
              stops={stopLocations}
              vehicleLocation={vehicleLocation}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleTrackerView;
