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
  Heart,
  Loader,
  Info,
  Users,
  Lock,
} from "lucide-react";
import BusMap from "../BusMap";
import BusMapComponent from "./BusMapComponent";
import { useTheme } from "../contexts/ThemeContext";
import { fetchTflRouteSequence } from "../utils/api";
const LiveBusView = ({
  selectedStop,
  liveArrivals,
  scheduledDepartures,
  fetchVehicleDetails,
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
  hasPlus,
}) => {
  const [liveVehicleJourney, setLiveVehicleJourney] = useState(null);
  const [isTrackingVehicle, setIsTrackingVehicle] = useState(false);
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [timeFormat, setTimeFormat] = useState("minutes");
  const [vehicleJourneyData, setVehicleJourneyData] = useState(null);
  const [journeyDataLoading, setJourneyDataLoading] = useState(false);
  const [journeyDataSource, setJourneyDataSource] = useState("");
  // New state for all stops search
  const [allStopsSearchQuery, setAllStopsSearchQuery] = useState("");
  const [allStopsResults, setAllStopsResults] = useState([]);
  const [allStopsLoading, setAllStopsLoading] = useState(false);
  const [allStopsError, setAllStopsError] = useState(null);
  const [showAllStopsSearch, setShowAllStopsSearch] = useState(false);
  const [selectedAllStop, setSelectedAllStop] = useState(null);
  const [allStopTrips, setAllStopTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [crowdingData, setCrowdingData] = useState({}); // { vehicleId: "high" | "medium" | "low" }
  const [crowdingLoading, setCrowdingLoading] = useState(false);
  const { themeClasses } = useTheme();
  const resolveStopNames = async (arrivals) => {
    return await Promise.all(
      arrivals.map(async (arrival) => {
        if (arrival.stopPoint?.commonName || arrival.stopPoint?.name) {
          return arrival; // already resolved
        }

        try {
          const res = await fetch(
            `https://api.tfl.gov.uk/StopPoint/${encodeURIComponent(
              arrival.naptanId?.trim() || ""
            )}`
          );
          if (!res.ok) return arrival;

          const stopData = await res.json();
          return {
            ...arrival,
            stopPoint: {
              ...stopData,
              commonName:
                stopData.commonName || stopData.name || arrival.naptanId,
            },
          };
        } catch (err) {
          console.warn("Failed to resolve stop:", arrival.naptanId, err);
          return arrival;
        }
      })
    );
  };

  const getBusInsight = (arrival) => {
    if (!hasPlus || !arrival.vehicleId) return null;

    const { confidence } = calculateConfidence(
      arrival.expectedArrival,
      arrival.scheduledArrival
    );

    const crowding = crowdingData[arrival.vehicleId];

    // If both are missing, return null
    if (confidence === null && !crowding) return null;

    return {
      confidence,
      crowding,
      hasConfidence: confidence !== null,
      hasCrowding: !!crowding,
    };
  };

  const calculateWalkingTime = (userLoc, stopLoc) => {
    if (!userLoc || !stopLoc?.lat || !stopLoc?.lon) return null;

    // Haversine formula for distance (in meters)
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    const dLat = toRad(stopLoc.lat - userLoc.lat);
    const dLon = toRad(stopLoc.lon - userLoc.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLoc.lat)) *
        Math.cos(toRad(stopLoc.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = R * c;

    // Assume avg walking speed: 1.4 m/s (~5 km/h)
    const walkingSeconds = distanceMeters / 1.4;
    const walkingMinutes = Math.round(walkingSeconds / 60);

    return walkingMinutes;
  };

  const fetchCrowdingForVehicles = async (arrivals) => {
    const vehicleIds = [
      ...new Set(
        arrivals
          .filter((a) => a.vehicleId && !a.isScheduled)
          .map((a) => a.vehicleId)
      ),
    ];

    if (vehicleIds.length === 0) return;

    setCrowdingLoading(true);
    const newCrowding = { ...crowdingData };

    try {
      // TfL crowding is stop-based, but we can approximate via stop + line
      // However, TfL *does* provide vehicle-level crowding for some routes!
      // We'll use: https://api.tfl.gov.uk/StopPoint/{stopId}/Crowding/{lineId}

      // For now, we'll fetch crowding per stop+line (best available proxy)
      const crowdingPromises = arrivals
        .filter((a) => a.vehicleId && a.lineId && selectedStop?.naptanId)
        .map(async (arrival) => {
          const stopId = selectedStop.naptanId;
          const lineId = arrival.lineId.toLowerCase();

          try {
            const res = await fetch(
              `https://api.tfl.gov.uk/StopPoint/${encodeURIComponent(
                stopId
              )}/Crowding/${encodeURIComponent(lineId)}`
            );

            if (!res.ok) return null;

            const data = await res.json();
            // TfL returns an array of "timeSlice" objects with "crowding" levels
            // We take the latest (first) one
            const latest = data?.timeSlice?.[0];
            if (latest?.crowding) {
              // TfL uses: 0 = low, 1 = medium, 2 = high
              let level = "low";
              if (latest.crowding >= 2) level = "high";
              else if (latest.crowding >= 1) level = "medium";

              return { vehicleId: arrival.vehicleId, level };
            }
          } catch (err) {
            console.warn("Crowding fetch failed for", arrival.vehicleId, err);
          }
          return null;
        });

      const results = await Promise.all(crowdingPromises);
      results.forEach((r) => {
        if (r) {
          newCrowding[r.vehicleId] = r.level;
        }
      });

      setCrowdingData(newCrowding);
      console.log("Crowding data updated:", newCrowding);
    } catch (err) {
      console.error("Error fetching crowding data:", err);
    } finally {
      setCrowdingLoading(false);
    }
  };

  // Fetch all TfL stops based on search query
  const searchAllStops = async (query) => {
    if (!query.trim()) {
      setAllStopsResults([]);
      return;
    }
    setAllStopsLoading(true);
    setAllStopsError(null);
    try {
      const res = await fetch(
        `https://api.tfl.gov.uk/StopPoint/Search/${encodeURIComponent(query)}`
      );
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      const data = await res.json();
      setAllStopsResults(data.matches || []);
    } catch (err) {
      console.error("Error searching stops:", err);
      setAllStopsError("Failed to search stops. Please try again.");
      setAllStopsResults([]);
    } finally {
      setAllStopsLoading(false);
    }
  };

  // Returns { confidence: number (0–100), label: string }
  const calculateConfidence = (expected, scheduled) => {
    if (!expected || !scheduled) return { confidence: null, label: "Unknown" };

    const expectedTime = new Date(expected).getTime();
    const scheduledTime = new Date(scheduled).getTime();
    const delayMs = expectedTime - scheduledTime;
    const delayMins = delayMs / 60000;

    // Base confidence: 100% if on time, drops by ~5% per minute late
    let confidence = Math.max(30, 100 - Math.abs(delayMins) * 5);

    // Bonus: if early, still penalize (buses rarely early = data glitch)
    if (delayMins < -1) confidence = Math.max(30, confidence - 10);

    // Round to nearest 5
    confidence = Math.round(confidence / 5) * 5;

    let label = "Reliable";
    if (confidence < 60) label = "Unreliable";
    else if (confidence < 80) label = "Fair";

    return { confidence, label };
  };

  const fetchStopDepartures = async (stop) => {
    if (!stop || !stop.id) return;
    setTripsLoading(true);
    setAllStopTrips([]);
    setSelectedAllStop(stop);
    setAllStopsError(null);
    try {
      // Only use TfL API — bustimes.org is not CORS-friendly in browser
      const tflResponse = await fetch(
        `https://api.tfl.gov.uk/StopPoint/${stop.id}/Arrivals`
      );
      if (!tflResponse.ok) {
        throw new Error(`TfL API error: ${tflResponse.status}`);
      }
      const tflData = await tflResponse.json();
      if (Array.isArray(tflData)) {
        const processedTrips = tflData.map((arrival) => ({
          lineId: arrival.lineId || arrival.lineName || "Unknown Line",
          destinationName: arrival.destinationName || "Unknown Destination",
          expectedArrival: arrival.expectedArrival || null,
          scheduledArrival: arrival.scheduledArrival || null,
          vehicleId: arrival.vehicleId || null,
          vehicleFleetNumber: arrival.fleetNumber || null,
          tripId: arrival.id,
          isScheduled: false,
          live: true,
          modeName: arrival.modeName || "bus",
        }));
        // Sort by expected arrival time
        processedTrips.sort((a, b) => {
          const timeA = new Date(a.expectedArrival || a.scheduledArrival);
          const timeB = new Date(b.expectedArrival || b.scheduledArrival);
          return timeA - timeB;
        });
        setAllStopTrips(processedTrips);
      } else {
        setAllStopTrips([]);
      }
    } catch (err) {
      console.error("Error fetching TfL arrivals:", err);
      setAllStopsError(
        "Failed to load live bus data. TfL API may be down or the stop has no live services."
      );
      setAllStopTrips([]);
    } finally {
      setTripsLoading(false);
    }
  };

  useEffect(() => {
    if (hasPlus && selectedStop && liveArrivals.length > 0) {
      fetchCrowdingForVehicles(liveArrivals);
    } else {
      setCrowdingData({});
    }
  }, [liveArrivals, selectedStop, hasPlus]);

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (showAllStopsSearch) {
        searchAllStops(allStopsSearchQuery);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [allStopsSearchQuery, showAllStopsSearch]);
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

  const [isFetching, setIsFetching] = useState(false);

  // Replace the existing fetchScheduledTrip function with this one

  const fetchScheduledTrip = async (lineId, destinationName) => {
    if (isFetching) return;
    setIsFetching(true);
    setJourneyDataLoading(true);
    setVehicleJourneyData(null);
    setJourneyDataSource("");

    try {
      console.log(`Fetching route sequence for line: ${lineId} from TfL...`);
      const { error: tflError, data: tflData } = await fetchTflRouteSequence(
        lineId
      );

      if (!tflError && tflData) {
        let tflStops = [];
        if (tflData.stopPointSequences?.[0]?.stopPoints) {
          tflStops = tflData.stopPointSequences[0].stopPoints;
        } else if (Array.isArray(tflData.stations)) {
          tflStops = tflData.stations;
        }

        const normalizedStops = tflStops.map((stop) => ({
          id: stop.naptanId || stop.id,
          name: stop.commonName || stop.name || "Unknown Stop",
          lat: stop.lat,
          lon: stop.lon,
          type: "tfl",
        }));

        setVehicleJourneyData(normalizedStops);
        setJourneyDataSource("tfl");
        console.log("Loaded route sequence from TfL (no scheduled times).");
      } else {
        console.warn(`TfL route sequence failed for ${lineId}:`, tflError);
        setVehicleJourneyData([]);
      }
    } catch (err) {
      console.error("Error in fetchScheduledTrip:", err);
      setVehicleJourneyData([]);
    } finally {
      setJourneyDataLoading(false);
      setIsFetching(false);
    }
  };
  const handleArrivalClick = async (arrival) => {
    setSelectedArrival(arrival);

    // Fetch static route for fallback
    fetchScheduledTrip(arrival.lineId, arrival.destinationName);

    // NEW: If we have a vehicleId, fetch its live journey
    if (arrival.vehicleId) {
      try {
        const { error, data } = await fetchVehicleDetails(arrival.vehicleId);
        if (!error && data && data.length > 0) {
          // Enrich with stop names if needed (like in VehicleTracker)
          const enrichedData = await resolveStopNames(data); // ← plural!
          setLiveVehicleJourney(enrichedData); // ← new state
        } else {
          setLiveVehicleJourney(null);
        }
      } catch (err) {
        console.error("Failed to fetch live vehicle journey:", err);
        setLiveVehicleJourney(null);
      }
    } else {
      setLiveVehicleJourney(null);
    }
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
  // Get favorite stops from nearestStops
  const favoriteStops = useMemo(() => {
    return JSON.parse(localStorage.getItem("favoriteStops") || "[]");
  }, [favorites]);
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

    const formatStopTime = (isoString) => {
      if (!isoString) return "N/A";
      if (timeFormat === "clock") {
        return new Date(isoString).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else {
        const now = new Date();
        const arrivalTime = new Date(isoString);
        const diffMins = Math.round((arrivalTime - now) / 60000);
        if (diffMins < 0) return `-${Math.abs(diffMins)} min ago`;
        if (diffMins === 0) return "Due";
        return `${diffMins} min`;
      }
    };

    // ✅ Fix: derive scheduled time for detail view consistently
    const detailScheduledTime = selectedArrival.scheduledArrival
      ? formatStopTime(selectedArrival.scheduledArrival)
      : selectedArrival.isScheduled && selectedArrival.tripId
      ? "Scheduled"
      : "N/A";

    return (
      <div
        className={`fixed inset-0 ${themeClasses.bg} bg-opacity-50 flex items-center justify-center z-50 p-4`}
      >
        <div
          className={`bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto`}
        >
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

            {/* ✅ Single Track Vehicle Button */}
            {(liveVehicleJourney?.length > 0 ||
              vehicleJourneyData?.length > 0) && (
              <div className="mt-4">
                <button
                  onClick={() => setIsTrackingVehicle(true)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Bus className="w-4 h-4" />
                  <span>Track Vehicle</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {/* ✅ Single Time Format Toggle */}
            <div className="flex justify-end mb-2">
              <button
                onClick={toggleTimeFormat}
                className="flex items-center space-x-1 p-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
              >
                {timeFormat === "minutes" ? (
                  <CalendarClock className="w-3 h-3" />
                ) : (
                  <Clock className="w-3 h-3" />
                )}
                <span>{timeFormat === "minutes" ? "HH:MM" : "Min"}</span>
              </button>
            </div>

            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" /> Full Route
              Schedule
            </h4>

            {journeyDataLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading full route...</p>
              </div>
            ) : liveVehicleJourney && liveVehicleJourney.length > 0 ? (
              // Live + Scheduled
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="flex justify-between items-center p-3 bg-gray-100 font-semibold text-sm border-b border-gray-200">
                  <span className="flex-1">Stop</span>
                  <span className="min-w-20 text-right">Scheduled</span>
                  <span className="min-w-20 text-right">Actual</span>
                </div>
                {liveVehicleJourney.map((stop, index) => {
                  let scheduledStop = vehicleJourneyData?.find(
                    (s) => s.id === stop.naptanId
                  );
                  if (!scheduledStop && stop.stopPoint?.commonName) {
                    scheduledStop = vehicleJourneyData?.find(
                      (s) =>
                        s.name &&
                        s.name
                          .toLowerCase()
                          .includes(stop.stopPoint.commonName.toLowerCase())
                    );
                  }
                  if (!scheduledStop && stop.stopPoint?.name) {
                    scheduledStop = vehicleJourneyData?.find(
                      (s) =>
                        s.name &&
                        s.name
                          .toLowerCase()
                          .includes(stop.stopPoint.name.toLowerCase())
                    );
                  }

                  const scheduledTime = scheduledStop?.aimedArrival
                    ? `${new Date().toISOString().split("T")[0]}T${
                        scheduledStop.aimedArrival
                      }`
                    : null;

                  return (
                    <div
                      key={`${stop.naptanId}-${index}`}
                      className={`flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 ${
                        index === 0 ? "bg-blue-100" : ""
                      }`}
                    >
                      {index === 0 && (
                        <span className="ml-2 text-blue-600">
                          <Bus className="w-4 h-4 inline" />
                        </span>
                      )}
                      <span className="text-gray-700 flex-1">
                        {index + 1}.{" "}
                        {stop.stopPoint?.commonName ||
                          stop.stopPoint?.name ||
                          stop.naptanId ||
                          "Unknown Stop"}
                      </span>
                      <span className="text-sm text-gray-500 min-w-20t-right">
                        {scheduledTime ? formatStopTime(scheduledTime) : "N/A"}
                      </span>
                      <span className="text-sm text-gray-500 min-w-20 text-right">
                        {formatStopTime(stop.expectedArrival)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : Array.isArray(vehicleJourneyData) &&
              vehicleJourneyData.length > 0 ? (
              // Static schedule only
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="flex justify-between items-center p-3 bg-gray-100 font-semibold text-sm border-b border-gray-200">
                  <span className="flex-1">Stop</span>
                  <span className="min-w-20t-right">Scheduled</span>
                  <span className="min-w-20 text-right">Actual</span>
                </div>
                {vehicleJourneyData.map((stop, index) => {
                  const scheduledTime = stop.aimedArrival
                    ? `${new Date().toISOString().split("T")[0]}T${
                        stop.aimedArrival
                      }`
                    : null;
                  return (
                    <div
                      key={stop.id || index}
                      className={`flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 ${
                        index === 0 ? "bg-blue-100" : ""
                      }`}
                    >
                      <span className="text-gray-700 flex-1">
                        {index + 1}. {stop.name || "Unknown Stop"}
                      </span>
                      <span className="text-sm text-gray-500 min-w-20t-right">
                        {scheduledTime ? formatStopTime(scheduledTime) : "N/A"}
                      </span>
                      <span className="text-sm text-gray-500 min-w-20t-right">
                        N/A
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>No route data available for this service.</p>
              </div>
            )}

            {/* Source Info */}
            {/* Source Info */}
            {journeyDataSource === "tfl" && (
              <div className="mt-2 text-xs text-yellow-700 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start">
                <AlertTriangle className="w-3 h-3 inline mr-1 shrink-0 mt-0.5" />
                <span>
                  Scheduled times not available.{" "}
                  {selectedArrival?.vehicleId ? (
                    <>
                      View full schedule and live map for this bus on{" "}
                      <a
                        href={`https://bustimes.org/vehicles/tflo-${selectedArrival.vehicleId.toLowerCase()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        bustimes.org
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      Check the full timetable on{" "}
                      <a
                        href="https://bustimes.org/operators/tf-london"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium"
                      >
                        bustimes.org
                      </a>
                      .
                    </>
                  )}
                </span>
              </div>
            )}
            {journeyDataSource === "bustimes" && (
              <div className="mt-2 text-xs text-gray-500 p-2 bg-gray-50 rounded">
                <Info className="w-3 h-3 inline mr-1" />
                Schedule from bustimes.org.
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Tracker Map Modal */}
        {isTrackingVehicle && (
          <div
            className={`fixed inset-0 ${themeClasses.bg} bg-opacity-50 flex items-center justify-center z-50 p-4`}
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] relative">
              <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                  Vehicle Tracker
                </h3>
                <button
                  onClick={() => setIsTrackingVehicle(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                  aria-label="Close map"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="h-[calc(100%-60px)] w-full">
                <BusMapComponent
                  stops={
                    liveVehicleJourney
                      ? liveVehicleJourney
                          .filter((s) => s.stopPoint?.lat && s.stopPoint?.lon)
                          .map((s) => ({
                            lat: s.stopPoint.lat,
                            lng: s.stopPoint.lon,
                            stopName:
                              s.stopPoint.commonName ||
                              s.stopPoint.name ||
                              s.naptanId,
                          }))
                      : vehicleJourneyData?.map((stop) => ({
                          lat: stop.lat,
                          lng: stop.lon,
                          stopName: stop.name,
                        })) || []
                  }
                  vehicleLocation={
                    liveVehicleJourney?.[0]?.stopPoint
                      ? {
                          lat: liveVehicleJourney[0].stopPoint.lat,
                          lng: liveVehicleJourney[0].stopPoint.lon,
                        }
                      : null
                  }
                  userLocation={userLocation || null}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {/* Location Section */}
      <div
        className={`${themeClasses.bg} rounded-xl shadow-lg p-4 border ${themeClasses.border}`}
      >
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
      {/* Favorites Section */}
      {favoriteStops.length > 0 && (
        <div className={`${themeClasses.bg} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center space-x-2 mb-4">
            <Heart className="w-5 h-5 text-red-500 fill-current" />
            <h3 className="text-lg font-semibold text-white-800">Favorites</h3>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {favoriteStops.map((stop) => (
              <div
                key={`fav-${stop.naptanId}`}
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
                    <p className="font-medium text-white-800">
                      {stop.commonName}
                    </p>
                    <p className="text-sm text-white-500">
                      {stop.indicator && `${stop.indicator} • `}
                      {stop.distance?.toFixed(0)}m away
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(stop.naptanId, stop);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full"
                >
                  <Star className={`w-5 h-5 text-yellow-500 fill-current`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Search All Stops Section */}
      <div className={`${themeClasses.bg} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Search All Stops
          </h3>
          <button
            onClick={() => setShowAllStopsSearch(!showAllStopsSearch)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {showAllStopsSearch ? "Hide" : "Show"}
          </button>
        </div>
        {showAllStopsSearch && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search all TfL stops..."
                value={allStopsSearchQuery}
                onChange={(e) => setAllStopsSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {allStopsLoading && (
              <div className="text-center py-4">
                <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                <p className="text-gray-600 mt-2">Searching stops...</p>
              </div>
            )}
            {allStopsError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <p className="text-red-700 text-sm">{allStopsError}</p>
                </div>
              </div>
            )}
            {allStopsResults.length > 0 && !allStopsLoading && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allStopsResults.slice(0, 10).map((stop) => (
                  <div
                    key={`all-${stop.id}`}
                    onClick={() => fetchStopDepartures(stop)}
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-gray-50 border-2 border-transparent"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="font-medium text-gray-800">{stop.name}</p>
                        <p className="text-sm text-gray-500">
                          {stop.indicator && `${stop.indicator} • `}
                          {stop.modeName}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(stop.id, {
                          // 👈 normalize to your expected shape
                          naptanId: stop.id,
                          commonName: stop.name,
                          indicator: stop.indicator,
                          lat: stop.lat,
                          lon: stop.lon,
                          distance: null, // not applicable for remote stops
                        });
                      }}
                      className="p-1 hover:bg-gray-200 rounded-full"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          favorites.has(stop.id)
                            ? "text-yellow-500 fill-current"
                            : "text-gray-400"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!allStopsLoading &&
              allStopsResults.length === 0 &&
              allStopsSearchQuery && (
                <div className="text-center py-4 text-gray-500">
                  <WifiOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p>No stops found matching "{allStopsSearchQuery}"</p>
                </div>
              )}
            {/* Display trips for selected stop */}
            {selectedAllStop && (
              <div
                className={`mt-6 ${themeClasses.bg} border ${themeClasses.border} rounded-lg p-4`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">
                    {selectedAllStop.name} Departures
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedAllStop(null);
                      setAllStopTrips([]);
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Close
                  </button>
                </div>
                {tripsLoading ? (
                  <div className="text-center py-4">
                    <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto" />
                    <p className="text-gray-600 mt-2">Loading departures...</p>
                  </div>
                ) : allStopTrips.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {allStopTrips.map((trip, index) => {
                      const serviceStatus = calculateServiceStatus(
                        trip.expectedArrival,
                        trip.scheduledArrival
                      );
                      const isLive = trip.live;
                      const isScheduled = trip.isScheduled;
                      return (
                        <div
                          key={`${trip.vehicleId || trip.tripId}-${index}`}
                          onClick={() => handleArrivalClick(trip)}
                          className={`flex items-start justify-between p-3 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${
                            isLive
                              ? "bg-linear-to-r from-blue-50 to-indigo-50 border-blue-100"
                              : "bg-linear-to-r from-green-50 to-emerald-50 border-green-100"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`w-10 h-10 ${
                                isLive ? "bg-blue-600" : "bg-green-600"
                              } text-white rounded-lg flex items-center justify-center font-bold text-sm`}
                            >
                              {trip.lineId?.toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800">
                                  To {trip.destinationName}
                                </p>
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  <span className="text-xs font-medium text-gray-700">
                                    {formatArrivalTimeForList(
                                      trip.expectedArrival,
                                      trip.scheduledArrival
                                    )}
                                  </span>
                                </div>
                              </div>
                              {isLive && serviceStatus.status !== "On Time" && (
                                <div className="flex items-center space-x-1 mt-1">
                                  <AlertTriangle className="w-2 h-2" />
                                  <span
                                    className={`text-xs font-medium ${serviceStatus.color}`}
                                  >
                                    {serviceStatus.status}{" "}
                                    {serviceStatus.minutes > 0 &&
                                      `by ${serviceStatus.minutes} min`}
                                  </span>
                                </div>
                              )}
                              {isScheduled && (
                                <div className="mt-1">
                                  <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                                    Scheduled
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1 text-xs">
                                {isLive && trip.vehicleId && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    Reg: {trip.vehicleId}
                                  </span>
                                )}
                                {isLive && trip.vehicleFleetNumber && (
                                  <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                                    Fleet: {trip.vehicleFleetNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Navigation className="w-4 h-4 text-blue-600 transform rotate-45 mt-1" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Info className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p>No departures found for this stop.</p>
                    <p className="text-xs mt-1">Try again in a few minutes.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      {/* Nearby Stops Section */}
      <div className={`${themeClasses.bg} rounded-xl shadow-lg p-6`}>
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
        {loading && !liveArrivals.length && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading nearby stops...</p>
          </div>
        )}
        {error && (
          <div
            className={`${themeClasses.bg} border ${themeClasses.border} rounded-lg p-3 mb-4`}
          >
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
                  toggleFavorite(stop.naptanId, stop); // 👈 pass full stop object!
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
      {/* Selected Stop Section */}
      {selectedStop && (
        <div className={`${themeClasses.bg} rounded-xl shadow-lg p-6`}>
          <div className="flex items-center space-x-2 mb-4">
            <Bus className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">
                {selectedStop.commonName}
                {selectedStop.indicator && ` (${selectedStop.indicator})`}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Stop ID: {selectedStop.naptanId}</span>
                {userLocation && selectedStop?.lat && selectedStop?.lon && (
                  <span>
                    • ~{calculateWalkingTime(userLocation, selectedStop)} min
                    walk
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <Map className="w-5 h-5" />
            </button>
          </div>
          {showMap && (
            <div className={`mb-4 p-4 ${themeClasses.bg} rounded-lg`}>
              <p className="text-sm text-gray-700 mb-2">
                Coordinates: {selectedStop.lat?.toFixed(6)},{" "}
                {selectedStop.lon?.toFixed(6)}
              </p>
              <BusMap selectedStop={selectedStop} />
            </div>
          )}
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
                  ? "Switch to HH:MM"
                  : "Switch to Minutes"}
              </span>
            </button>
          </div>
          {loading && combinedArrivals.length === 0 && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">Loading bus data...</p>
            </div>
          )}
          {combinedArrivals.length === 0 && !loading && (
            <div className="text-center py-6 text-gray-500">
              <Bus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No buses scheduled for this stop in the near future.</p>
              <p className="text-sm mt-1">Try again in a few minutes.</p>
            </div>
          )}
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
                      ? "bg-linear-to-r from-blue-50 to-indigo-50 border-blue-100"
                      : "bg-linear-to-r from-green-50 to-emerald-50 border-green-100"
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
                            {formatArrivalTimeForList(
                              arrival.expectedArrival,
                              arrival.scheduledArrival
                            )}
                          </span>
                        </div>
                      </div>
                      {isLive &&
                        arrival.expectedArrival &&
                        arrival.scheduledArrival && (
                          <div className="mt-1">
                            {(() => {
                              const { confidence, label } = calculateConfidence(
                                arrival.expectedArrival,
                                arrival.scheduledArrival
                              );
                              if (confidence === null) return null;
                              let barColor = "bg-green-500";
                              if (confidence < 60) barColor = "bg-red-500";
                              else if (confidence < 80)
                                barColor = "bg-yellow-500";
                              return (
                                <div className="flex items-center space-x-2">
                                  <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${barColor} rounded-full`}
                                      style={{ width: `${confidence}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-medium text-gray-600">
                                    {confidence}% {label}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
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
                      {isScheduled && (
                        <div className="mt-1">
                          <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            Scheduled
                          </span>
                        </div>
                      )}
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

                        {hasPlus && isLive && arrival.vehicleId && (
                          <div className="mt-1">
                            {crowdingLoading ? (
                              <span className="text-xs text-gray-500">
                                Analyzing...
                              </span>
                            ) : (
                              (() => {
                                const insight = getBusInsight(arrival);
                                if (!insight) {
                                  // Still show confidence if available, even without crowding
                                  const { confidence } = calculateConfidence(
                                    arrival.expectedArrival,
                                    arrival.scheduledArrival
                                  );
                                  if (confidence !== null) {
                                    let color = "text-green-600";
                                    if (confidence < 60) color = "text-red-600";
                                    else if (confidence < 80)
                                      color = "text-yellow-600";
                                    return (
                                      <span
                                        className={`text-xs font-medium ${color}`}
                                      >
                                        {confidence}% Reliable
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="text-xs text-gray-500">
                                      No insight
                                    </span>
                                  );
                                }

                                return (
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    {insight.hasConfidence && (
                                      <span
                                        className={`font-medium ${
                                          insight.confidence < 60
                                            ? "text-red-600"
                                            : insight.confidence < 80
                                            ? "text-yellow-600"
                                            : "text-green-600"
                                        }`}
                                      >
                                        {insight.confidence}% Reliable
                                      </span>
                                    )}
                                    {insight.hasConfidence &&
                                      insight.hasCrowding && <span>•</span>}
                                    {insight.hasCrowding && (
                                      <span
                                        className={`font-medium ${
                                          insight.crowding === "high"
                                            ? "text-red-600"
                                            : insight.crowding === "medium"
                                            ? "text-yellow-600"
                                            : insight.crowding === "low"
                                            ? "text-green-600"
                                            : "text-gray-500"
                                        }`}
                                      >
                                        {insight.crowding === "high"
                                          ? "Busy"
                                          : insight.crowding === "medium"
                                          ? "Moderate"
                                          : insight.crowding === "low"
                                          ? "Quiet"
                                          : "Unknown"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            )}
                          </div>
                        )}

                        {/* ✅ MOVED INSIDE THE CARD — FOR FREE USERS */}
                        {!hasPlus && isLive && (
                          <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs font-medium rounded-full">
                            <Lock className="w-3 h-3 mr-1 inline" /> Crowding
                            (Plus)
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
