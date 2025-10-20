import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  MapPin,
  Clock,
  Bus,
  Navigation,
  Info,
  Settings as SettingsIcon,
  Star,
  AlertTriangle,
  RefreshCw,
  Map,
  Locate,
  WifiOff,
  AlertCircle,
  X,
  Menu,
} from "lucide-react";
import BusMap from "./BusMap";
import LiveBusView from "./components/LiveBusView";
import JourneyPlanner from "./components/JourneyPlanner";
import EnthusiastHub from "./components/EnthusisatHub";
import VehicleTrackerView from "./components/VehicleTrackerView";
import BusMapComponent from "./components/BusMapComponent";
import ServiceDisruptionsTab from "./components/ServiceDisruptions";
import PremiumPage from "./components/PremiumPage";
import SettingsPage from "./components/Settings";
import { useUser } from "./contexts/UserContexts";

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
  const [adblockDetected, setAdblockDetected] = useState(false);
  const [adblockModalStep, setAdblockModalStep] = useState("initial"); // 'initial' | 'instructions'
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState("light"); // New theme state
  const { subscription } = useUser();
  // New state for the notification banner
  const [showInfoBanner, setShowInfoBanner] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

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
    { id: "vehicle", label: "Vehicle Tracker", icon: Navigation },
    { id: "disruptions", label: "Service Disruptions", icon: AlertTriangle },
    { id: "settings", label: "Settings", icon: SettingsIcon }, // Added Settings tab
    { id: "plus", label: "LBT Plus", icon: Star },
  ];

  const searchTimeoutRef = useRef(null);
  const locationTimeoutRef = useRef(null);
  const journeySearchTimeoutRef = useRef(null);

  // Check for the "dontShowInfoBanner" flag on mount
  useEffect(() => {
    const hasSeenBanner = localStorage.getItem("dontShowInfoBanner");
    if (!hasSeenBanner) {
      setShowInfoBanner(true);
    }

    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem("appTheme");
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme to document body
  useEffect(() => {
    document.body.className = getThemeClasses(theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  // Adblock detection
  useEffect(() => {
    if (subscription?.isActive) return; // Skip if user has active subscription
    const checkAdblock = () => {
      const adElement = document.querySelector(".adsbygoogle");
      if (adElement) {
        const { offsetHeight, offsetWidth } = adElement;
        if (offsetHeight === 0 && offsetWidth === 0) {
          setAdblockDetected(true);
        }
      } else {
        setAdblockDetected(true);
      }
    };

    // Small delay to allow ad script to load (if not blocked)
    const timer = setTimeout(() => {
      if (!localStorage.getItem("dismissedAdblockNotice")) {
        checkAdblock();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [subscription]);

  const getThemeClasses = (themeName) => {
    switch (themeName) {
      case "dark":
        return "bg-gray-900 text-white";
      case "high-contrast":
        return "bg-black text-yellow-300";
      case "minimalist":
        return "bg-gray-50 text-gray-800";
      default:
        return "bg-gradient-to-br from-blue-50 via-white to-indigo-50";
    }
  };

  // Get input text color based on theme
  const getInputTextColor = () => {
    switch (theme) {
      case "dark":
        return "text-white placeholder-gray-400";
      case "high-contrast":
        return "text-yellow-300 placeholder-yellow-400";
      case "minimalist":
        return "text-gray-800 placeholder-gray-500";
      default:
        return "text-gray-900 placeholder-gray-500";
    }
  };

  // Get input background and border colors based on theme
  const getInputBgAndBorder = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800 border-gray-700 focus:border-blue-500";
      case "high-contrast":
        return "bg-black border-yellow-500 focus:border-yellow-400";
      case "minimalist":
        return "bg-white border-gray-200 focus:border-blue-500";
      default:
        return "bg-white border-gray-300 focus:border-blue-500";
    }
  };

  const handleInfoBannerAgree = () => {
    if (dontShowAgain) {
      localStorage.setItem("dontShowInfoBanner", "true");
    }
    setShowInfoBanner(false);
  };

  const fetchVehicleJourney = async (vehicleId) => {
    const response = await fetch(`/api/vehicleJourney/${vehicleId}`);
    if (!response.ok) throw new Error("Failed to fetch journey data");
    return response.json();
  };

  const fetchVehicleDetails = async (vehicleId) => {
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
          console.warn(`Vehicle with ID ${vehicleId} not found.`);
          return { error: "Vehicle not found", data: null };
        }
        throw new Error(`TfL API error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log(`Vehicle details for ${vehicleId}:`, data);
      return { error: null, data };
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
        enableHighAccuracy: false,
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

  // Theme-specific header classes
  const getHeaderClasses = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800 shadow-sm border-b border-gray-700";
      case "high-contrast":
        return "bg-black shadow-sm border-b border-yellow-500";
      case "minimalist":
        return "bg-white shadow-sm border-b border-gray-200";
      default:
        return "bg-white shadow-sm border-b border-gray-100";
    }
  };

  const getTextColor = (baseColor, isPlaceholder = false) => {
    switch (theme) {
      case "high-contrast":
        if (isPlaceholder) return "text-yellow-300"; // brighter, more visible
        return "text-yellow-1000";

      case "dark":
        if (isPlaceholder) return "text-gray-400"; // readable but still looks like a placeholder
        if (baseColor.includes("white")) return "text-gray-100";
        if (baseColor.includes("gray")) return "text-gray-200";
        return "text-gray-100";

      case "minimalist":
        if (isPlaceholder) return "text-gray-500";
        if (baseColor.includes("gray-900")) return "text-gray-800";
        if (baseColor.includes("gray-700")) return "text-gray-700";
        if (baseColor.includes("gray-500")) return "text-gray-600";
        return "text-gray-800";

      default:
        return baseColor || "text-gray-900";
    }
  };

  return (
    <div className="min-h-screen">
      {/* Information Banner - Top Right Corner */}
      {/* Adblock Detected Banner */}
      {/* Adblock Detected Full-Screen Modal */}
      {/* Adblock Detected Full-Screen Modal */}
      {adblockDetected && !localStorage.getItem("dismissedAdblockNotice") && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6">
              {adblockModalStep === "initial" ? (
                <>
                  <div className="flex justify-center mb-4">
                    <AlertCircle className="w-12 h-12 text-orange-500" />
                  </div>
                  <h2 className="text-xl font-bold text-center text-gray-900 mb-3">
                    Support This Free Service
                  </h2>
                  <p className="text-gray-600 text-center mb-6">
                    We use Google AdSense to keep London Bus Tracker free for
                    everyone. Please consider disabling your ad blocker — it
                    really helps us out!
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => setAdblockModalStep("instructions")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      I’ll disable it
                    </button>
                    <button
                      onClick={() => setAdblockDetected(false)}
                      className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Nevermind
                    </button>
                  </div>
                </>
              ) : (
                // Instructions Step
                <>
                  <div className="flex justify-center mb-4">
                    <Info className="w-12 h-12 text-blue-500" />
                  </div>
                  <h2 className="text-xl font-bold text-center text-gray-900 mb-4">
                    How to Disable Your Ad Blocker
                  </h2>
                  <div className="text-gray-700 space-y-3 text-sm mb-6">
                    <p>
                      1. Look for the ad blocker icon in your browser’s address
                      bar (usually 🛡️, 🚫, or a hand).
                    </p>
                    <p>
                      2. Click the icon and choose{" "}
                      <strong>“Disable on this site”</strong> or similar.
                    </p>
                    <p>
                      3. Refresh the page to load ads and support this service.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Don’t worry — we only show non-intrusive Google AdSense
                      ads.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        localStorage.setItem("dismissedAdblockNotice", "true");
                        setAdblockDetected(false);
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      I’ve disabled it
                    </button>
                    <button
                      onClick={() => setAdblockModalStep("initial")}
                      className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      ← Go back
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showInfoBanner && (
        <div className="fixed top-4 right-4 z-50 max-w-xs w-full animate-in slide-in-from-top duration-300">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    Free Service Notice
                  </h3>
                  <p className="text-xs text-gray-600">
                    This service is free with no hidden charges. Ads help keep
                    it running.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInfoBanner(false)}
                className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3 h-3 text-blue-600 rounded focus:ring-blue-500 mr-2"
                />
                Don't show again
              </label>
              <button
                onClick={handleInfoBannerAgree}
                className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      <header className={getHeaderClasses()}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1
                  className={`text-xl font-bold ${getTextColor(
                    "text-gray-900"
                  )}`}
                >
                  London Bus Tracker
                </h1>
                <p className={`text-xs ${getTextColor("text-gray-500")}`}>
                  Live TfL Bus Data
                </p>
              </div>
            </div>

            <div className="hidden md:flex space-x-1 bg-white/10 p-1 rounded-xl backdrop-blur-sm">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-blue-600 text-white shadow-md"
                      : `${getTextColor(
                          "text-gray-600"
                        )} hover:text-gray-900 hover:bg-gray-100/50`
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100/50 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <>
                  <div className="w-6 h-0.5 bg-gray-600 mb-1.5"></div>
                  <div className="w-6 h-0.5 bg-gray-600 my-0.5"></div>
                  <div className="w-6 h-0.5 bg-gray-600 mt-1.5"></div>
                </>
              )}
            </button>

            <div className="hidden md:block">
              <span className="text-sm text-green-600 font-medium flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Live Data Active
              </span>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="md:hidden mt-2 pb-4 border-t border-gray-100">
              <div className="flex flex-col space-y-2 pt-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg font-medium ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : `${getTextColor(
                            "text-gray-700"
                          )} hover:bg-gray-100/50`
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              theme={theme}
              getInputTextColor={getInputTextColor}
              getInputBgAndBorder={getInputBgAndBorder}
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
              theme={theme}
              getInputTextColor={getInputTextColor}
              getInputBgAndBorder={getInputBgAndBorder}
            />
          )}
          {activeTab === "enthusiast" && (
            <EnthusiastHub favorites={favorites} nearestStops={nearestStops} />
          )}
          {activeTab === "vehicle" && (
            <VehicleTrackerView
              vehicleIdInput={vehicleIdInput}
              setVehicleIdInput={setVehicleIdInput}
              fetchVehicleDetails={fetchVehicleDetails}
              BusMapComponent={BusMapComponent}
              theme={theme}
              getInputTextColor={getInputTextColor}
              getInputBgAndBorder={getInputBgAndBorder}
            />
          )}
          {activeTab === "disruptions" && <ServiceDisruptionsTab />}
          {activeTab === "plus" && <PremiumPage />}
          {activeTab === "settings" && (
            <SettingsPage
              currentTheme={theme}
              onThemeChange={setTheme}
              setActiveTab={setActiveTab} // 👈 passing the function down
            />
          )}
        </div>
      </div>
      {/* Adblock detection placeholder - invisible */}
      <div className="hidden">
        <ins
          className="adsbygoogle"
          style={{ display: "block", height: "1px" }}
          data-ad-client="ca-pub-YOUR_PUB_ID" // Replace with your actual AdSense publisher ID
          data-ad-slot="0000000000" // Use a real or dummy ad slot
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    </div>
  );
};

export default App;
