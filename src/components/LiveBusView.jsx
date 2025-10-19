import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  Clock,
  Bus,
  RefreshCw,
  Map,
  Locate,
  WifiOff,
  AlertCircle,
  AlertTriangle,
  Navigation,
  Star,
  X,
  Calendar,
  CalendarClock,
} from "lucide-react";
import BusMap from "../BusMap";
import { fetchTflRouteSequence } from "../utils/api";

const LiveBusView = ({
  selectedStop,
  liveArrivals,
  scheduledDepartures,
  searchQuery,
  setSearchQuery,
  refreshData,
  isRefreshing,
  loading,
  nearestStops,
  error,
  locationError,
  userLocation,
  getCurrentLocation,
  handleStopSelect,
  showMap,
  setShowMap,
  calculateServiceStatus,
  formatArrivalTime,
  favorites,
  toggleFavorite,
}) => {
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [timeFormat, setTimeFormat] = useState("minutes");
  const [vehicleJourneyData, setVehicleJourneyData] = useState(null);
  const [journeyDataLoading, setJourneyDataLoading] = useState(false);
  const [journeyDataSource, setJourneyDataSource] = useState("");

  const resolveStopName = async (atcoOrNaptanId) => {
    if (!atcoOrNaptanId) return "Unknown Stop";

    try {
      const res = await fetch(
        `https://api.tfl.gov.uk/StopPoint/${atcoOrNaptanId}`
      );
      if (!res.ok) return atcoOrNaptanId;
      const data = await res.json();
      return data.commonName || data.stopLetter || atcoOrNaptanId;
    } catch {
      return atcoOrNaptanId;
    }
  };

  const scheduledArrivalsForStop = useMemo(() => {
    if (
      !selectedStop ||
      !scheduledDepartures ||
      scheduledDepartures.length === 0
    ) {
      return [];
    }

    const selectedStopId = selectedStop.naptanId;
    const arrivals = [];

    scheduledDepartures.forEach((trip) => {
      if (trip.times && Array.isArray(trip.times)) {
        trip.times.forEach((stopTime) => {
          if (stopTime.stop && stopTime.stop.atco_code === selectedStopId) {
            arrivals.push({
              lineId: trip.service?.line_name || "Unknown Line",
              destinationName: trip.headsign || "Unknown Destination",
              expectedArrival: null,
              scheduledArrival: stopTime.aimed_departure_time
                ? `${new Date().toISOString().split("T")[0]}T${
                    stopTime.aimed_departure_time
                  }`
                : null,
              vehicleId: null,
              vehicleFleetNumber: null,
              tripId: trip.id,
              isScheduled: true,
            });
          }
        });
      }
    });

    return arrivals.sort(
      (a, b) => new Date(a.scheduledArrival) - new Date(b.scheduledArrival)
    );
  }, [scheduledDepartures, selectedStop]);

  const combinedArrivals = useMemo(() => {
    const allArrivals = [...liveArrivals, ...scheduledArrivalsForStop];
    return allArrivals.sort((a, b) => {
      const timeA = new Date(a.expectedArrival || a.scheduledArrival);
      const timeB = new Date(b.expectedArrival || b.scheduledArrival);
      return timeA - timeB;
    });
  }, [liveArrivals, scheduledArrivalsForStop]);

  const fetchScheduledTrip = async (lineId, destinationName) => {
    setJourneyDataLoading(true);
    setVehicleJourneyData(null);
    setJourneyDataSource(""); // Reset source

    try {
      console.log(`Fetching schedule for line: ${lineId} from TfL API...`);
      const { error: tflError, data: tflData } = await fetchTflRouteSequence(
        lineId
      );

      if (!tflError && tflData) {
        console.log("TfL route data received successfully.");
        // Process TfL data - it might be structured differently
        // The main sequence of stops is usually in tflData.stations or tflData.stopPointSequences
        // Example structure might be tflData.stopPointSequences[0]?.stopPoints
        // Or tflData.stations directly if using /Line/{id}/Route endpoint (which might need direction)
        // Let's assume it's tflData.stations for simplicity based on common structure
        // Process TfL data - correct structure assumption
        let tflStops = [];

        if (
          tflData &&
          tflData.stopPointSequences &&
          tflData.stopPointSequences.length > 0
        ) {
          // Most common structure: stopPointSequences[0].stopPoints
          tflStops = tflData.stopPointSequences[0].stopPoints || [];
        } else if (tflData && Array.isArray(tflData.stations)) {
          // Fallback: use stations array if available
          tflStops = tflData.stations;
        } else {
          console.warn("Unexpected TfL data structure:", tflData);
        }

        // Normalize TfL stop structure for consistency
        const normalizedStops = await Promise.all(
          tflStops.map(async (stop) => {
            // Correct property names for TfL stop objects
            const stopId = stop.naptanId || stop.id; // TfL uses naptanId
            const stopName =
              stop.commonName || stop.stopLetter || "Unknown Stop";

            let finalName = stopName;
            if (finalName === "Unknown Stop" && stopId) {
              finalName = await resolveStopName(stopId); // Resolve via API if needed
            }

            return {
              id: stopId,
              name: finalName,
              lat: stop.lat, // TfL provides lat/lon directly
              lon: stop.lon,
              type: "tfl",
            };
          })
        );

        setVehicleJourneyData(normalizedStops);
        setJourneyDataSource("tfl");

        return; // Exit after TfL success
      } else {
        console.warn(
          `TfL API failed or returned no data for line ${lineId}:`,
          tflError
        );
        // If TfL fails, try bustimes.org
        console.log(
          `Fetching schedule for line: ${lineId}, destination: ${destinationName} from bustimes.org...`
        );
        const response = await fetch(
          `https://bustimes.org/api/trips/?service__line_name=${encodeURIComponent(
            lineId
          )}&headsign=${encodeURIComponent(destinationName)}`
        );

        if (!response.ok) {
          if (response.status === 404) {
            console.warn(
              `bustimes.org schedule not found for line: ${lineId}, destination: ${destinationName}`
            );
            setVehicleJourneyData([]);
            setJourneyDataSource("bustimes");
            return;
          }
          throw new Error(`bustimes.org API error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(
          `bustimes.org schedule data for ${lineId} to ${destinationName}:`,
          data
        );

        if (data.results && data.results.length > 0) {
          const firstMatch = data.results[0];
          const normalizedBustimesStops = await Promise.all(
            firstMatch.times.map(async (stopTime) => {
              const stopId = stopTime.stop?.atco_code;
              const stopName =
                stopTime.stop?.name ||
                stopTime.stop?.common_name ||
                (stopId ? await resolveStopName(stopId) : "Unknown Stop");

              return {
                id: stopId,
                name: stopName,
                aimedArrival: stopTime.aimed_arrival_time,
                aimedDeparture: stopTime.aimed_departure_time,
                type: "bustimes",
              };
            })
          );

          setVehicleJourneyData(normalizedBustimesStops);
          setJourneyDataSource("bustimes");
        } else {
          console.log(
            `No bustimes.org trips found for line: ${lineId}, destination: ${destinationName}`
          );
          setVehicleJourneyData([]);
          setJourneyDataSource("bustimes");
        }
      }
    } catch (err) {
      console.error(
        "Error fetching scheduled trip (TfL or bustimes.org):",
        err
      );
      setVehicleJourneyData([]); // Set to empty array on error
      setJourneyDataSource("");
    }
    setJourneyDataLoading(false);
  };

  const handleArrivalClick = (arrival) => {
    setSelectedArrival(arrival);

    fetchScheduledTrip(arrival.lineId, arrival.destinationName);
  };

  const closeDetailedView = () => {
    setSelectedArrival(null);
    setVehicleJourneyData(null);
    setJourneyDataLoading(false);
  };

  const toggleTimeFormat = () => {
    setTimeFormat((prev) => (prev === "minutes" ? "clock" : "minutes"));
  };

  const filteredStops = nearestStops.filter(
    (stop) =>
      stop.commonName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stop.indicator?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatScheduledTimeForDetail = (timeString) => {
    if (!timeString) return "N/A";

    const today = new Date().toISOString().split("T")[0];
    const isoString = `${today}T${timeString}`;

    return formatTimeForDetail(isoString);
  };

  const formatArrivalTimeForList = (expectedArrival, scheduledArrival) => {
    const timeToUse = expectedArrival || scheduledArrival;
    if (!timeToUse) return "N/A";

    if (timeFormat === "clock") {
      const date = new Date(timeToUse);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      const now = new Date();
      const arrivalTime = new Date(timeToUse);
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

  if (selectedArrival) {
    const serviceStatus = calculateServiceStatus(
      selectedArrival.expectedArrival,
      selectedArrival.scheduledArrival
    );

    const formatTimeForDetail = (isoString) => {
      if (!isoString) return "N/A";
      if (timeFormat === "clock") {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
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
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Service Details</h3>
            <button
              onClick={closeDetailedView}
              className="p-1 rounded-full hover:bg-gray-100"
              aria-label="Close details"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Service Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
                {selectedArrival.lineId?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  To {selectedArrival.destinationName}
                </p>
                <p className="text-sm text-gray-500">
                  Service {selectedArrival.lineId?.toUpperCase()}
                </p>
              </div>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              {selectedArrival.vehicleId && (
                <p>
                  <span className="font-medium">Registration:</span>{" "}
                  {selectedArrival.vehicleId}
                </p>
              )}
              {selectedArrival.vehicleFleetNumber && (
                <p>
                  <span className="font-medium">Fleet Number:</span>{" "}
                  {selectedArrival.vehicleFleetNumber}
                </p>
              )}
            </div>
            <div className="mt-3 flex items-center space-x-2">
              <span className="font-medium">Status:</span>
              <span className={`text-sm font-medium ${serviceStatus.color}`}>
                {serviceStatus.status}
                {serviceStatus.status !== "On Time" &&
                  serviceStatus.minutes > 0 &&
                  ` by ${serviceStatus.minutes} min`}
              </span>
            </div>
          </div>

          {Array.isArray(vehicleJourneyData) && vehicleJourneyData.length > 0
            ? vehicleJourneyData.map((tripStop, index) => {
                // Extract stop information from the bustimes.org structure
                const stopName =
                  tripStop.stop?.name ||
                  tripStop.stop?.common_name ||
                  tripStop.stop?.atco_code ||
                  "Unknown Stop";
                const aimedArrivalTime = tripStop.aimed_arrival_time; // e.g., "08:05:00"
                const aimedDepartureTime = tripStop.aimed_departure_time; // e.g., "08:05:00"

                // Format the time string (HH:MM:SS) for display
                const formattedArrivalTime =
                  formatScheduledTimeForDetail(aimedArrivalTime);
                const formattedDepartureTime =
                  formatScheduledTimeForDetail(aimedDepartureTime);

                return (
                  <div
                    key={`${tripStop.stop?.atco_code || index}-${index}`} // Use a more unique key if possible
                    className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-700">{stopName}</span>
                    <div className="flex space-x-3 text-sm">
                      <span className="text-gray-500">
                        Arr: {formattedArrivalTime || "N/A"}
                      </span>
                      <span className="font-medium text-gray-600">
                        Dep: {formattedDepartureTime || "N/A"}
                      </span>
                    </div>
                  </div>
                );
              })
            : null}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
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

          <div className="p-4">
            <h4 className="font-semibold text-gray-800 mb-3">
              Scheduled Stop Schedule
            </h4>
            {journeyDataLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading schedule...</p>
              </div>
            ) : Array.isArray(vehicleJourneyData) &&
              vehicleJourneyData.length > 0 ? (
              <div className="space-y-2">
                {vehicleJourneyData.map((stop, i) => (
                  <div
                    key={stop.id || i}
                    className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-gray-700">
                      {stop.name || "Unknown Stop"}
                    </span>
                    {stop.aimedDeparture && (
                      <div className="flex space-x-3 text-sm">
                        <span className="text-gray-500">
                          Arr: {formatScheduledTimeForDetail(stop.aimedArrival)}
                        </span>
                        <span className="font-medium text-gray-600">
                          Dep:{" "}
                          {formatScheduledTimeForDetail(stop.aimedDeparture)}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <p>No detailed schedule available for this service.</p>
                {selectedArrival?.lineId && (
                  <p className="text-xs mt-1">
                    (Could not find schedule for {selectedArrival.lineId} on TfL
                    API)
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <Locate className="w-5 h-5 text-blue-600" />
          <div>
            {locationError ? (
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600 text-sm">{locationError}</span>
                <button
                  onClick={getCurrentLocation}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-2"
                >
                  Retry
                </button>
              </div>
            ) : userLocation ? (
              <p className="text-sm text-gray-600">
                Location: {userLocation.lat.toFixed(4)},{" "}
                {userLocation.lng.toFixed(4)}
              </p>
            ) : (
              <p className="text-sm text-gray-600">Getting your location...</p>
            )}
          </div>
        </div>
      </div>

      {}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search nearby stops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Detailed schedule preview removed (duplicate); detailed schedule is shown in the service details panel when a service is selected */}

        {loading && !liveArrivals.length && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading nearby stops...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredStops.map((stop) => (
            <div
              key={stop.naptanId}
              onClick={() => handleStopSelect(stop)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedStop?.naptanId === stop.naptanId
                  ? "bg-blue-50 border-2 border-blue-200"
                  : "hover:bg-gray-50 border-2 border-transparent"
              }`}
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-gray-800">{stop.commonName}</p>
                  <p className="text-sm text-gray-500">
                    {stop.indicator && `${stop.indicator} • `}
                    {stop.distance?.toFixed(0)}m away
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(stop.naptanId);
                }}
                className="p-1 hover:bg-gray-200 rounded-full"
              >
                <Star
                  className={`w-5 h-5 ${
                    favorites.has(stop.naptanId)
                      ? "text-yellow-500 fill-current"
                      : "text-gray-400"
                  }`}
                />
              </button>
            </div>
          ))}

          {filteredStops.length === 0 && !loading && (
            <div className="text-center py-4 text-gray-500">
              <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>No bus stops found nearby</p>
            </div>
          )}
        </div>
      </div>

      {}
      {selectedStop && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Bus className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedStop.commonName}
                {selectedStop.indicator && ` (${selectedStop.indicator})`}
              </h3>
              <p className="text-sm text-gray-500">
                Stop ID: {selectedStop.naptanId}
              </p>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Map className="w-5 h-5" />
            </button>
          </div>

          {showMap && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                Coordinates: {selectedStop.lat?.toFixed(6)},{" "}
                {selectedStop.lon?.toFixed(6)}
              </p>
              <BusMap selectedStop={selectedStop} />
            </div>
          )}

          {}
          <div className="flex items-center justify-end mb-4">
            <button
              onClick={toggleTimeFormat}
              className="flex items-center space-x-1 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              {timeFormat === "minutes" ? (
                <CalendarClock className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              <span>
                {timeFormat === "minutes"
                  ? "Switch to 18:00"
                  : "Switch to Minutes"}
              </span>
            </button>
          </div>

          {}
          {loading && combinedArrivals.length === 0 && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading bus data...</p>
            </div>
          )}

          {}
          {combinedArrivals.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-500">
              <Bus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No buses scheduled for this stop in the near future.</p>
              <p className="text-sm mt-1">Try again in a few minutes.</p>
            </div>
          )}

          {}
          <div className="space-y-3">
            {combinedArrivals.map((arrival, index) => {
              const serviceStatus = calculateServiceStatus(
                arrival.expectedArrival,
                arrival.scheduledArrival
              );

              const isLive = !arrival.isScheduled;
              const isScheduled = arrival.isScheduled;

              return (
                <div
                  key={`${arrival.vehicleId || arrival.tripId}-${index}`}
                  onClick={() => handleArrivalClick(arrival)}
                  className={`flex items-start justify-between p-4 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${
                    isLive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                      : "bg-gradient-to-r from-green-50 to-emerald-50 border-green-100"
                  }`}
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`w-12 h-12 ${
                        isLive ? "bg-blue-600" : "bg-green-600"
                      } text-white rounded-lg flex items-center justify-center font-bold text-lg`}
                    >
                      {arrival.lineId?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800">
                          To {arrival.destinationName}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">
                            {}
                            {formatArrivalTimeForList(
                              arrival.expectedArrival,
                              arrival.scheduledArrival
                            )}
                          </span>
                        </div>
                      </div>

                      {}
                      {isLive && serviceStatus.status !== "On Time" && (
                        <div className="flex items-center space-x-1 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span
                            className={`text-xs font-medium ${serviceStatus.color}`}
                          >
                            {serviceStatus.status}{" "}
                            {serviceStatus.minutes > 0 &&
                              `by ${serviceStatus.minutes} min`}
                          </span>
                        </div>
                      )}

                      {}
                      {isScheduled && (
                        <div className="mt-1">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            Scheduled
                          </span>
                        </div>
                      )}

                      {}
                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                        {isLive && arrival.vehicleId && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                            Reg: {arrival.vehicleId}
                          </span>
                        )}
                        {isLive && arrival.vehicleFleetNumber && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                            Fleet: {arrival.vehicleFleetNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Navigation className="w-5 h-5 text-blue-600 transform rotate-45 mt-2" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBusView;
