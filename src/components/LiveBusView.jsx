import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  MapPin,
  Clock,
  Bus,
  Map,
  Locate,
  WifiOff,
  AlertCircle,
  AlertTriangle,
  Navigation,
  Star,
  X,
  CalendarClock,
  Heart,
  Loader,
  Info,
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
  showMap: externalShowMap,
  setShowMap: setExternalShowMap,
  calculateServiceStatus,
  formatArrivalTime,
  favorites,
  toggleFavorite,
  hasPlus,
}) => {
  // --- Local state ---
  const [selectedArrival, setSelectedArrival] = useState(null);
  const [timeFormat, setTimeFormat] = useState("minutes");
  const [liveVehicleJourney, setLiveVehicleJourney] = useState(null);
  const [vehicleJourneyData, setVehicleJourneyData] = useState(null);
  const [journeyDataLoading, setJourneyDataLoading] = useState(false);
  const [journeyDataSource, setJourneyDataSource] = useState("");
  const [isTrackingVehicle, setIsTrackingVehicle] = useState(false);
  const [showMap, setShowMap] = useState(externalShowMap || false);
  const { themeClasses } = useTheme();

  // Sync external showMap if needed
  useEffect(() => {
    if (setExternalShowMap) setShowMap(externalShowMap);
  }, [externalShowMap]);

  // --- Derived data ---
  const scheduledArrivalsForStop = useMemo(() => {
    if (!selectedStop || !scheduledDepartures?.length) return [];
    const stopId = selectedStop.naptanId;
    return scheduledDepartures.flatMap((trip) =>
      (trip.times || []).filter(t => t.stop?.atco_code === stopId).map(stopTime => ({
        lineId: trip.service?.line_name || "Unknown",
        destinationName: trip.headsign || "Unknown",
        scheduledArrival: stopTime.aimed_departure_time
          ? `${new Date().toISOString().split("T")[0]}T${stopTime.aimed_departure_time}`
          : null,
        isScheduled: true,
        tripId: trip.id,
      }))
    ).sort((a, b) => new Date(a.scheduledArrival) - new Date(b.scheduledArrival));
  }, [scheduledDepartures, selectedStop]);

  const combinedArrivals = useMemo(() => {
    return [...liveArrivals, ...scheduledArrivalsForStop].sort((a, b) => {
      const timeA = new Date(a.expectedArrival || a.scheduledArrival);
      const timeB = new Date(b.expectedArrival || b.scheduledArrival);
      return timeA - timeB;
    });
  }, [liveArrivals, scheduledArrivalsForStop]);

  const filteredStops = useMemo(() => {
    return nearestStops.filter(stop =>
      (stop.commonName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (stop.indicator?.toLowerCase() || "").includes(searchQuery.toLowerCase())
    );
  }, [nearestStops, searchQuery]);

  // --- Helpers ---
  const resolveStopNames = async (arrivals) => {
    return Promise.all(
      arrivals.map(async (arrival) => {
        if (arrival.stopPoint?.commonName) return arrival;
        try {
          const res = await fetch(`https://api.tfl.gov.uk/StopPoint/${encodeURIComponent(arrival.naptanId || "")}`);
          if (!res.ok) return arrival;
          const data = await res.json();
          return { ...arrival, stopPoint: { ...data, commonName: data.commonName || data.name || arrival.naptanId } };
        } catch {
          return arrival;
        }
      })
    );
  };

  const fetchScheduledTrip = async (lineId) => {
    setJourneyDataLoading(true);
    try {
      const { error, data } = await fetchTflRouteSequence(lineId);
      if (!error && data) {
        const stops = data.stopPointSequences?.[0]?.stopPoints || data.stations || [];
        setVehicleJourneyData(stops.map(s => ({
          id: s.naptanId || s.id,
          name: s.commonName || s.name || "Unknown",
          lat: s.lat,
          lon: s.lon,
        })));
        setJourneyDataSource("tfl");
      } else {
        setVehicleJourneyData([]);
      }
    } catch {
      setVehicleJourneyData([]);
    } finally {
      setJourneyDataLoading(false);
    }
  };

  const handleArrivalClick = async (arrival) => {
    setSelectedArrival(arrival);
    fetchScheduledTrip(arrival.lineId);

    if (arrival.vehicleId && fetchVehicleDetails) {
      try {
        const { error, data } = await fetchVehicleDetails(arrival.vehicleId);
        if (!error && data?.length) {
          const enriched = await resolveStopNames(data);
          setLiveVehicleJourney(enriched);
        } else {
          setLiveVehicleJourney(null);
        }
      } catch {
        setLiveVehicleJourney(null);
      }
    } else {
      setLiveVehicleJourney(null);
    }
  };

  const closeDetailedView = () => {
    setSelectedArrival(null);
    setLiveVehicleJourney(null);
    setVehicleJourneyData(null);
    setIsTrackingVehicle(false);
  };

  const toggleTimeFormat = () => setTimeFormat(prev => prev === "minutes" ? "clock" : "minutes");

  const formatStopTime = (isoString) => {
    if (!isoString) return "N/A";
    if (timeFormat === "clock") {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      const diffMins = Math.round((new Date(isoString) - Date.now()) / 60000);
      if (diffMins < 0) return `${-diffMins} min ago`;
      if (diffMins === 0) return "Due";
      return `${diffMins} min`;
    }
  };

  const formatArrivalTimeForList = (expected, scheduled) => {
    return formatStopTime(expected || scheduled) || "N/A";
  };

  // --- Render: Detailed View Modal ---
  if (selectedArrival) {
    const serviceStatus = calculateServiceStatus(
      selectedArrival.expectedArrival,
      selectedArrival.scheduledArrival
    );

    return (
      <div className={`fixed inset-0 ${themeClasses.bg} bg-opacity-50 flex items-center justify-center z-50 p-4`}>
        {/* Service Details Modal */}
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">Service Details</h3>
            <button onClick={closeDetailedView} className="p-1 rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
                {selectedArrival.lineId?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800">To {selectedArrival.destinationName}</p>
                <p className="text-sm text-gray-500">Service {selectedArrival.lineId?.toUpperCase()}</p>
              </div>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              {selectedArrival.vehicleId && <p><span className="font-medium">Registration:</span> {selectedArrival.vehicleId}</p>}
              {selectedArrival.vehicleFleetNumber && <p><span className="font-medium">Fleet Number:</span> {selectedArrival.vehicleFleetNumber}</p>}
            </div>

            <div className="mt-3 flex items-center space-x-2">
              <span className="font-medium">Status:</span>
              <span className={`text-sm font-medium ${serviceStatus.color}`}>
                {serviceStatus.status}
                {serviceStatus.status !== "On Time" && serviceStatus.minutes > 0 && ` by ${serviceStatus.minutes} min`}
              </span>
            </div>

            {(liveVehicleJourney?.length > 0 || vehicleJourneyData?.length > 0) && (
              <div className="mt-4">
                <button
                  onClick={() => setIsTrackingVehicle(true)}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Bus className="w-4 h-4" /> <span>Track Vehicle</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            <div className="flex justify-end mb-2">
              <button
                onClick={toggleTimeFormat}
                className="flex items-center space-x-1 p-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs"
              >
                {timeFormat === "minutes" ? <CalendarClock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                <span>{timeFormat === "minutes" ? "HH:MM" : "Min"}</span>
              </button>
            </div>

            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" /> Full Route Schedule
            </h4>

            {journeyDataLoading ? (
              <div className="text-center py-4">
                <Loader className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-600">Loading full route...</p>
              </div>
            ) : liveVehicleJourney?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="flex justify-between p-3 bg-gray-100 font-semibold text-sm border-b">
                  <span className="flex-1">Stop</span>
                  <span className="min-w-20 text-right">Scheduled</span>
                  <span className="min-w-20 text-right">Actual</span>
                </div>
                {liveVehicleJourney.map((stop, i) => {
                  const scheduled = vehicleJourneyData?.find(s => s.id === stop.naptanId);
                  const scheduledTime = scheduled?.aimedArrival
                    ? `${new Date().toISOString().split("T")[0]}T${scheduled.aimedArrival}`
                    : null;
                  return (
                    <div key={i} className={`flex justify-between p-3 border-b last:border-b-0 ${i === 0 ? "bg-blue-100" : ""}`}>
                      {i === 0 && <Bus className="w-4 h-4 text-blue-600 mr-2" />}
                      <span className="flex-1">{i + 1}. {stop.stopPoint?.commonName || stop.naptanId}</span>
                      <span className="min-w-20 text-right text-sm text-gray-500">{scheduledTime ? formatStopTime(scheduledTime) : "N/A"}</span>
                      <span className="min-w-20 text-right text-sm text-gray-500">{formatStopTime(stop.expectedArrival)}</span>
                    </div>
                  );
                })}
              </div>
            ) : vehicleJourneyData?.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="flex justify-between p-3 bg-gray-100 font-semibold text-sm border-b">
                  <span className="flex-1">Stop</span>
                  <span className="min-w-20 text-right">Scheduled</span>
                  <span className="min-w-20 text-right">Actual</span>
                </div>
                {vehicleJourneyData.map((stop, i) => {
                  const time = stop.aimedArrival ? `${new Date().toISOString().split("T")[0]}T${stop.aimedArrival}` : null;
                  return (
                    <div key={stop.id || i} className={`flex justify-between p-3 border-b last:border-b-0 ${i === 0 ? "bg-blue-100" : ""}`}>
                      <span className="flex-1">{i + 1}. {stop.name}</span>
                      <span className="min-w-20 text-right text-sm text-gray-500">{time ? formatStopTime(time) : "N/A"}</span>
                      <span className="min-w-20 text-right text-sm text-gray-500">N/A</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>No route data available.</p>
              </div>
            )}

            {journeyDataSource === "tfl" && (
              <div className="mt-2 text-xs text-yellow-700 p-2 bg-yellow-50 border border-yellow-200 rounded flex items-start">
                <AlertTriangle className="w-3 h-3 mt-0.5 mr-1" />
                <span>Scheduled times not available. Check full timetable on <a href="https://bustimes.org" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">bustimes.org</a>.</span>
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Tracker Map Modal */}
        {isTrackingVehicle && (
          <div className={`fixed inset-0 ${themeClasses.bg} bg-opacity-50 flex items-center justify-center z-50 p-4`}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl h-[80vh] relative">
              <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold">Vehicle Tracker</h3>
                <button onClick={() => setIsTrackingVehicle(false)} className="p-1 rounded-full hover:bg-gray-100">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="h-[calc(100%-60px)] w-full">
                <BusMapComponent
                  stops={
                    (liveVehicleJourney?.length
                      ? liveVehicleJourney.filter(s => s.stopPoint?.lat).map(s => ({
                          lat: s.stopPoint.lat,
                          lng: s.stopPoint.lon,
                          stopName: s.stopPoint.commonName || s.naptanId,
                        }))
                      : vehicleJourneyData?.map(s => ({ lat: s.lat, lng: s.lon, stopName: s.name })) || [])
                  }
                  vehicleLocation={
                    liveVehicleJourney?.[0]?.stopPoint
                      ? { lat: liveVehicleJourney[0].stopPoint.lat, lng: liveVehicleJourney[0].stopPoint.lon }
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

  // --- Render: Main View ---
  return (
    <div className="space-y-4">
      {/* Location */}
      <div className={`${themeClasses.bg} rounded-xl shadow p-4 border ${themeClasses.border}`}>
        <div className="flex items-center space-x-2">
          <Locate className="w-5 h-5 text-blue-600" />
          {locationError ? (
            <span className="text-red-600 text-sm">
              {locationError}{" "}
              <button onClick={getCurrentLocation} className="text-blue-600 underline">Retry</button>
            </span>
          ) : userLocation ? (
            <span className="text-sm text-gray-600">Nearby stops loaded</span>
          ) : (
            <span className="text-sm text-gray-600">Finding your location...</span>
          )}
        </div>
      </div>

      {/* Nearby Stops */}
      <div className={`${themeClasses.bg} rounded-xl shadow p-4`}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search nearby stops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-4">
            <Loader className="w-5 h-5 animate-spin mx-auto text-gray-500" />
            <p className="text-gray-500 mt-2">Loading stops...</p>
          </div>
        ) : filteredStops.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No stops found</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredStops.map((stop) => (
              <div
                key={stop.naptanId}
                onClick={() => handleStopSelect(stop)}
                className={`flex justify-between items-center p-3 rounded cursor-pointer ${
                  selectedStop?.naptanId === stop.naptanId ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="font-medium">{stop.commonName}</p>
                  <p className="text-xs text-gray-500">
                    {stop.indicator && `${stop.indicator} • `}{stop.distance?.toFixed(0)}m
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(stop.naptanId, stop);
                  }}
                >
                  <Star
                    className={`w-5 h-5 ${
                      favorites.has(stop.naptanId) ? "text-yellow-500 fill-current" : "text-gray-400"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Stop */}
      {selectedStop && (
        <div className={`${themeClasses.bg} rounded-xl shadow p-4`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">{selectedStop.commonName}{selectedStop.indicator && ` (${selectedStop.indicator})`}</h3>
              <p className="text-sm text-gray-500">Stop ID: {selectedStop.naptanId}</p>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
            >
              <Map className="w-5 h-5" />
            </button>
          </div>

          {showMap && (
            <div className="mb-4 rounded-lg overflow-hidden border">
              <BusMap selectedStop={selectedStop} />
            </div>
          )}

          <div className="flex justify-end mb-3">
            <button
              onClick={toggleTimeFormat}
              className="flex items-center space-x-1 text-sm text-blue-700"
            >
              {timeFormat === "minutes" ? <CalendarClock className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              <span>{timeFormat === "minutes" ? "Switch to HH:MM" : "Switch to Minutes"}</span>
            </button>
          </div>

          {combinedArrivals.length === 0 && !loading ? (
            <p className="text-gray-500 py-4">No buses scheduled soon</p>
          ) : (
            <div className="space-y-2">
              {combinedArrivals.map((arrival, i) => {
                const status = calculateServiceStatus(arrival.expectedArrival, arrival.scheduledArrival);
                const isLive = !arrival.isScheduled;
                return (
                  <div
                    key={i}
                    onClick={() => handleArrivalClick(arrival)}
                    className={`flex justify-between items-start p-3 rounded cursor-pointer border ${
                      isLive ? "bg-blue-50 border-blue-100" : "bg-green-50 border-green-100"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium">
                          {arrival.lineId?.toUpperCase()} → {arrival.destinationName}
                        </p>
                        <span className="text-sm text-gray-700">
                          {formatArrivalTimeForList(arrival.expectedArrival, arrival.scheduledArrival)}
                        </span>
                      </div>
                      {isLive && status.status !== "On Time" && (
                        <div className="flex items-center mt-1 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          <span className={status.color}>{status.status}{status.minutes > 0 && ` by ${status.minutes} min`}</span>
                        </div>
                      )}
                      {arrival.isScheduled && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded mt-1 inline-block">
                          Scheduled
                        </span>
                      )}
                    </div>
                    <Navigation className="w-4 h-4 text-blue-600 mt-1 ml-2 transform rotate-45" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveBusView;