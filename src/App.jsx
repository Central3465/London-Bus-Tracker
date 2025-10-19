import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  Bus,
  Navigation,
  Info,
  Settings,
  Star,
  AlertTriangle,
  RefreshCw,
  Map,
  Locate,
  WifiOff,
  AlertCircle,
} from "lucide-react";
import BusMap from "./BusMap";
import LiveBusView from "./components/LiveBusView";
import JourneyPlanner from "./components/JourneyPlanner";
import EnthusiastHub from "./components/EnthusisatHub";
import VehicleTrackerView from "./components/VehicleTrackerView";
import BusMapComponent from "./components/BusMapComponent";
import {
  fetchNearestStops,
  fetchLiveArrivals,
  fetchJourneyPlan,
  fetchVehicleJourney,
  fetchScheduledDepartures,
} from "./utils/api";

const TFL_APP_ID = import.meta.env.VITE_TFL_APP_ID;
const TFL_APP_KEY = import.meta.env.VITE_TFL_APP_KEY;
const TFL_API_BASE = "https://api.tfl.gov.uk";

const App = () => {
  const [activeTab, setActiveTab] = useState("live");
  const [vehicleIdInput, setVehicleIdInput] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStops, setNearestStops] = useState([]);
  const [selectedStop, setSelectedStop] = useState(null);
  const [liveArrivals, setLiveArrivals] = useState([]);
  const [scheduledDepartures, setScheduledDepartures] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [journeyFrom, setJourneyFrom] = useState("");
  const [journeyTo, setJourneyTo] = useState("");
  const [journeyResults, setJourneyResults] = useState(null);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState(null);

  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);

  const tabs = [
    { id: "live", label: "Live Buses", icon: Bus },
    { id: "journey", label: "Journey Planner", icon: Navigation },
    { id: "enthusiast", label: "Enthusiast Hub", icon: Star },
    { id: "vehicle", label: "Vehicle Tracker", icon: Navigation }, // Define the vehicle tab here
  ];

  const searchTimeoutRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const journeySearchTimeoutRef = useRef(null);

  const fetchVehicleJourney = async (vehicleId) => {
    const response = await fetch(`/api/vehicleJourney/${vehicleId}`);
    if (!response.ok) throw new Error("Failed to fetch journey data");
    return response.json();
  };

  const fetchVehicleDetails = async (vehicleId) => {
    // Example API call to TfL - check their documentation for the exact endpoint
    // e.g., /Vehicle/{id}/Arrivals
    const url = `https://api.tfl.gov.uk/Vehicle/${encodeURIComponent(
      vehicleId
    )}/Arrivals`;
    const params = new URLSearchParams({
      app_id: TFL_APP_ID,
      app_key: TFL_APP_KEY,
    });

    try {
      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        if (response.status === 404) {
          // Handle case where vehicle ID is not found
          console.warn(`Vehicle with ID ${vehicleId} not found.`);
          return { error: "Vehicle not found", data: null };
        }
        throw new Error(`TfL API error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Vehicle details for ${vehicleId}:`, data);
      return { error: null, data }; // Return both error and data
    } catch (err) {
      console.error("Error fetching vehicle details:", err);
      return { error: err.message, data: null };
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setLocationError(null);

    // First, try with low accuracy (fast, reliable)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Small delay to avoid race conditions
        setTimeout(() => {
          fetchNearestStops(latitude, longitude)
            .then((stops) => {
              setNearestStops(stops);
              if (stops.length > 0) {
                setSelectedStop(stops[0]);
                fetchLiveArrivalsForStop(stops[0].naptanId);
              }
            })
            .catch((err) => {
              setError(err.message);
            })
            .finally(() => {
              setLoading(false);
            });
        }, 100);
      },
      (error) => {
        console.warn("Low-accuracy geolocation failed:", error);

        // Optional: retry with high accuracy if low fails
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setUserLocation({ lat: latitude, lng: longitude });
            setTimeout(() => {
              fetchNearestStops(latitude, longitude)
                .then((stops) => {
                  setNearestStops(stops);
                  if (stops.length > 0) {
                    setSelectedStop(stops[0]);
                    fetchLiveArrivalsForStop(stops[0].naptanId);
                  }
                })
                .catch((err) => setError(err.message))
                .finally(() => setLoading(false));
            }, 100);
          },
          (highAccError) => {
            console.error(
              "High-accuracy geolocation also failed:",
              highAccError
            );
            setLocationError(
              "Unable to get your location. Please check permissions or try again."
            );
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000,
          }
        );
      },
      {
        enableHighAccuracy: false, // ← Key change: start with false
        timeout: 8000,
        maximumAge: 300000,
      }
    );
  };

  const fetchLiveArrivalsForStop = async (stopId) => {
    if (!stopId) return;

    setLoading(true);
    setError(null);
    try {
      const arrivals = await fetchLiveArrivals(stopId);
      setLiveArrivals(arrivals);
    } catch (err) {
      console.error("Error fetching live arrivals:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchScheduledDeparturesForStop = async (stopId) => {
    if (!stopId) return;

    setLoading(true);
    try {
      const departures = await fetchScheduledDepartures(stopId);
      setScheduledDepartures(departures);
    } catch (err) {
      console.error("Error fetching scheduled departures:", err);
      setScheduledDepartures([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStopData = async (stopId) => {
    // Fetch both live and scheduled data when a stop is selected
    await Promise.allSettled([
      fetchLiveArrivalsForStop(stopId),
      fetchScheduledDeparturesForStop(stopId),
    ]);
  };

  const refreshData = async () => {
    if (!selectedStop) return;
    setIsRefreshing(true);
    await fetchLiveArrivalsForStop(selectedStop.naptanId);
    setIsRefreshing(false);
  };

  const calculateServiceStatus = (expectedArrival, scheduledArrival) => {
    if (!scheduledArrival) return { status: "On Time", minutes: 0 };

    const expected = new Date(expectedArrival);
    const scheduled = new Date(scheduledArrival);
    const diffMinutes = Math.round((expected - scheduled) / (1000 * 60));

    if (diffMinutes <= -2) {
      return {
        status: "Early",
        minutes: Math.abs(diffMinutes),
        color: "text-green-600",
      };
    } else if (diffMinutes >= 2) {
      return { status: "Delayed", minutes: diffMinutes, color: "text-red-600" };
    } else {
      return { status: "On Time", minutes: 0, color: "text-gray-600" };
    }
  };

  const formatArrivalTime = (expectedArrival) => {
    const now = new Date();
    const arrival = new Date(expectedArrival);
    const diffMinutes = Math.floor((arrival - now) / (1000 * 60));

    if (diffMinutes <= 0) return "Due";
    if (diffMinutes === 1) return "1 min";
    return `${diffMinutes} mins`;
  };

  useEffect(() => {
    getCurrentLocation();

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current);
      if (journeySearchTimeoutRef.current)
        clearTimeout(journeySearchTimeoutRef.current);
    };
  }, []);

  const handleAutocomplete = (query, type) => {
    if (!query) {
      if (type === "from") setFromSuggestions([]);
      else setToSuggestions([]);
      return;
    }

    clearTimeout(journeySearchTimeoutRef.current);
    journeySearchTimeoutRef.current = setTimeout(async () => {
      try {
        const suggestions = await fetchAutocomplete(query);
        if (type === "from") setFromSuggestions(suggestions);
        else setToSuggestions(suggestions);
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handlePlanJourney = async () => {
    if (!journeyFrom.trim() || !journeyTo.trim()) {
      setJourneyError("Please enter both 'From' and 'To' locations");
      return;
    }

    setJourneyLoading(true);
    setJourneyError(null);

    try {
      const results = await fetchJourneyPlan(
        journeyFrom,
        journeyTo,
        userLocation
      );
      setJourneyResults(results);
    } catch (err) {
      console.error("Error fetching journey plan:", err);
      setJourneyError(err.message);
    } finally {
      setJourneyLoading(false);
    }
  };

  const handleStopSelect = (stop) => {
    setSelectedStop(stop);
    fetchAllStopData(stop.naptanId);
  };

  const toggleFavorite = (stopId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(stopId)) {
      newFavorites.delete(stopId);
    } else {
      newFavorites.add(stopId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {}
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  London Bus Tracker
                </h1>
                <p className="text-xs text-gray-500">Live TfL Bus Data</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-green-600 font-medium flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live Data Active
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-white p-1 rounded-xl shadow-sm mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {}
          <div className="max-w-4xl mx-auto">
            {activeTab === "live" && (
              <LiveBusView
                selectedStop={selectedStop}
                liveArrivals={liveArrivals}
                scheduledDepartures={scheduledDepartures}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                refreshData={refreshData}
                isRefreshing={isRefreshing}
                loading={loading}
                nearestStops={nearestStops}
                error={error}
                locationError={locationError}
                userLocation={userLocation}
                getCurrentLocation={getCurrentLocation}
                handleStopSelect={handleStopSelect}
                showMap={showMap}
                setShowMap={setShowMap}
                calculateServiceStatus={calculateServiceStatus}
                formatArrivalTime={formatArrivalTime}
                favorites={favorites}
                toggleFavorite={toggleFavorite}
                fetchVehicleJourney={fetchVehicleJourney}
              />
            )}
            {activeTab === "journey" && (
              <JourneyPlanner
                userLocation={userLocation}
                journeyFrom={journeyFrom}
                setJourneyFrom={setJourneyFrom}
                journeyTo={journeyTo}
                setJourneyTo={setJourneyTo}
                journeyResults={journeyResults}
                setJourneyResults={setJourneyResults}
                journeyLoading={journeyLoading}
                setJourneyLoading={setJourneyLoading}
                journeyError={journeyError}
                setJourneyError={setJourneyError}
                fromSuggestions={fromSuggestions}
                setFromSuggestions={setFromSuggestions}
                toSuggestions={toSuggestions}
                setToSuggestions={setToSuggestions}
                handleAutocomplete={handleAutocomplete}
                handlePlanJourney={handlePlanJourney}
              />
            )}
            {activeTab === "enthusiast" && (
              <EnthusiastHub
                favorites={favorites}
                nearestStops={nearestStops}
              />
            )}
            {activeTab === "vehicle" && (
              <VehicleTrackerView
                vehicleIdInput={vehicleIdInput}
                setVehicleIdInput={setVehicleIdInput}
                fetchVehicleDetails={fetchVehicleDetails}
                BusMapComponent={BusMapComponent}
              />
            )}
          </div>
        </div>

        {}
      </div>
    </div>
  );
};

export default App;
