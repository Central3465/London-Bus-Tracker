import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Navigation,
  AlertTriangle,
  Clock,
  Footprints,
  Bus,
  Train,
  Bike,
  Car,
  ChevronRight,
  Star,
  X,
  Check,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Map,
} from "lucide-react";

const JourneyPlanner = ({
  userLocation,
  journeyFrom,
  setJourneyFrom,
  journeyTo,
  setJourneyTo,
  journeyResults,
  setJourneyResults,
  journeyLoading,
  setJourneyLoading,
  journeyError,
  setJourneyError,
  handlePlanJourney,
}) => {
  const [selectedJourney, setSelectedJourney] = useState(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [savedJourneys, setSavedJourneys] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);

  // Autocomplete states
  const [fromSuggestions, setFromSuggestions] = useState([]);
  const [toSuggestions, setToSuggestions] = useState([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [selectedFromLocation, setSelectedFromLocation] = useState(null);
  const [selectedToLocation, setSelectedToLocation] = useState(null);

  // Map states
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 51.5074, lng: -0.1278 }); // London default
  const [mapZoom, setMapZoom] = useState(12);

  const fromInputRef = useRef(null);
  const toInputRef = useRef(null);

  // Fetch suggestions for autocomplete
  const fetchSuggestions = async (query, type) => {
    if (!query.trim()) {
      if (type === "from") {
        setFromSuggestions([]);
        setShowFromSuggestions(false);
      } else {
        setToSuggestions([]);
        setShowToSuggestions(false);
      }
      return;
    }

    try {
      const response = await fetch(
        `https://api.tfl.gov.uk/StopPoint/Search/${encodeURIComponent(
          query
        )}?app_key=${import.meta.env.VITE_TFL_APP_KEY}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch suggestions");
      }

      const data = await response.json();
      const suggestions = data.matches?.slice(0, 8) || [];

      if (type === "from") {
        setFromSuggestions(suggestions);
        setShowFromSuggestions(true);
      } else {
        setToSuggestions(suggestions);
        setShowToSuggestions(true);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      if (type === "from") {
        setFromSuggestions([]);
        setShowFromSuggestions(false);
      } else {
        setToSuggestions([]);
        setShowToSuggestions(false);
      }
    }
  };

  // Enhanced function to fetch journey data from TfL API
  const fetchJourneyData = async (from, to) => {
    try {
      // First, get the stop points for the locations
      let fromStopId = null;
      let toStopId = null;

      // Search for from location
      if (from && from !== "current_location") {
        const fromRes = await fetch(
          `https://api.tfl.gov.uk/StopPoint/Search/${encodeURIComponent(
            from
          )}?app_key=${import.meta.env.VITE_TFL_APP_KEY}`
        );
        if (!fromRes.ok) throw new Error("Failed to find starting location");

        const fromData = await fromRes.json();
        if (fromData.matches && fromData.matches.length > 0) {
          fromStopId = fromData.matches[0].id;
        } else {
          throw new Error(`No locations found for: ${from}`);
        }
      }

      // Search for to location
      if (to) {
        const toRes = await fetch(
          `https://api.tfl.gov.uk/StopPoint/Search/${encodeURIComponent(
            to
          )}?app_key=${import.meta.env.VITE_TFL_APP_KEY}`
        );
        if (!toRes.ok) throw new Error("Failed to find destination");

        const toData = await toRes.json();
        if (toData.matches && toData.matches.length > 0) {
          toStopId = toData.matches[0].id;
        } else {
          throw new Error(`No locations found for: ${to}`);
        }
      }

      // If we have stop IDs, get journey plan
      if (fromStopId && toStopId) {
        const journeyRes = await fetch(
          `https://api.tfl.gov.uk/Journey/JourneyResults/${fromStopId}/to/${toStopId}?app_key=${
            import.meta.env.VITE_TFL_APP_KEY
          }`
        );

        if (!journeyRes.ok) throw new Error("Failed to get journey results");

        const journeyData = await journeyRes.json();

        // Process the journey data with better error handling
        const processedJourneys = [];

        if (journeyData.journeys && journeyData.journeys.length > 0) {
          journeyData.journeys.forEach((journey, index) => {
            const legs = [];

            // Process each leg of the journey with better data extraction
            if (journey.legs && journey.legs.length > 0) {
              journey.legs.forEach((leg) => {
                // Extract mode information from multiple possible fields
                let modeName = "Walking"; // Default to walking
                if (leg.mode?.name) {
                  modeName = leg.mode.name;
                } else if (leg.routeOptions && leg.routeOptions.length > 0) {
                  modeName = leg.routeOptions[0].mode || "Transport";
                } else if (leg.modeName) {
                  modeName = leg.modeName;
                }
                legs.push(processedLeg);

                const totalDuration = legs.reduce(
                  (sum, leg) => sum + leg.duration,
                  0
                );

                const processedJourney = {
                  id: index + 1,
                  duration: totalDuration,
                  legs: legs, // 👈 assign the processed legs
                  startTime: journey.startDateTime,
                  endTime: journey.endDateTime,
                  totalDuration: totalDuration,
                };

                // Extract route information
                let routeName = "";
                if (leg.routeOptions && leg.routeOptions.length > 0) {
                  routeName = leg.routeOptions[0].name || "";
                } else if (leg.routeName) {
                  routeName = leg.routeName;
                } else if (leg.line && leg.line.name) {
                  routeName = leg.line.name;
                }

                // Extract location names with fallbacks
                const fromName =
                  leg.departurePoint?.commonName ||
                  leg.from?.name ||
                  leg.from?.commonName ||
                  "Starting point";

                const toName =
                  leg.arrivalPoint?.commonName ||
                  leg.to?.name ||
                  leg.to?.commonName ||
                  "Destination";

                const departureTime =
                  leg.departureTime ||
                  leg.startDateTime ||
                  journey.startDateTime;
                const arrivalTime =
                  leg.arrivalTime || leg.endDateTime || journey.endDateTime;

                // Calculate duration from timestamps (fallback to leg.duration if needed)
                let calculatedDuration = leg.duration || 0; // fallback
                if (departureTime && arrivalTime) {
                  const dep = new Date(departureTime).getTime();
                  const arr = new Date(arrivalTime).getTime();
                  if (!isNaN(dep) && !isNaN(arr)) {
                    calculatedDuration = Math.max(
                      0,
                      Math.round((arr - dep) / 1000)
                    );
                  }
                }

                const processedLeg = {
                  mode: {
                    name: modeName,
                    type: modeName.toLowerCase(),
                  },
                  routeName: routeName,
                  departureTime: departureTime,
                  arrivalTime: arrivalTime,
                  duration: calculatedDuration,
                  from: {
                    name: fromName,
                    lat: leg.departurePoint?.lat || leg.from?.lat || 0,
                    lon: leg.departurePoint?.lon || leg.from?.lon || 0,
                  },
                  to: {
                    name: toName,
                    lat: leg.arrivalPoint?.lat || leg.to?.lat || 0,
                    lon: leg.arrivalPoint?.lon || leg.to?.lon || 0,
                  },
                  instruction:
                    leg.instruction?.summary || leg.instruction?.detailed || "",
                  isWalking: modeName.toLowerCase().includes("walk"),
                };

                processedJourney.legs.push(processedLeg);
              });
            }

            processedJourneys.push(processedJourney);
          });
        }

        return {
          journeys: processedJourneys,
          totalJourneys: processedJourneys.length,
        };
      }

      return null;
    } catch (error) {
      console.error("Error fetching journey data:", error);
      throw error;
    }
  };

  // Enhanced plan journey function
  const planJourney = async () => {
    if (!journeyFrom || !journeyTo) {
      setJourneyError("Please enter both starting and destination locations");
      return;
    }

    // Validate input
    if (journeyFrom.trim() === journeyTo.trim()) {
      setJourneyError("Starting location and destination cannot be the same");
      return;
    }

    setJourneyLoading(true);
    setJourneyError(null);
    setJourneyResults(null);

    try {
      const result = await fetchJourneyData(journeyFrom, journeyTo);

      if (result && result.journeys.length > 0) {
        setJourneyResults(result);
        // Add to search history
        setSearchHistory((prev) => {
          const newSearch = {
            from: journeyFrom,
            to: journeyTo,
            date: new Date().toLocaleString(),
            resultsCount: result.totalJourneys,
          };

          // Remove duplicates and keep only last 5 searches
          const filtered = prev.filter(
            (item) =>
              !(item.from === newSearch.from && item.to === newSearch.to)
          );
          return [newSearch, ...filtered].slice(0, 5);
        });

        // Set map center to midpoint of first journey
        const firstJourney = result.journeys[0];
        if (firstJourney.legs && firstJourney.legs.length > 0) {
          const firstLeg = firstJourney.legs[0];
          const lastLeg = firstJourney.legs[firstJourney.legs.length - 1];

          if (
            firstLeg.from.lat &&
            firstLeg.from.lon &&
            lastLeg.to.lat &&
            lastLeg.to.lon
          ) {
            const centerLat = (firstLeg.from.lat + lastLeg.to.lat) / 2;
            const centerLng = (firstLeg.from.lon + lastLeg.to.lon) / 2;
            setMapCenter({ lat: centerLat, lng: centerLng });
            setShowMap(true);
          }
        }
      } else {
        setJourneyError(
          "No journey options found. Please try different locations or check your spelling."
        );
      }
    } catch (error) {
      console.error("Journey planning error:", error);
      setJourneyError(
        error.message ||
          "An error occurred while planning your journey. Please try again."
      );
    } finally {
      setJourneyLoading(false);
    }
  };

  // Save journey to favorites
  const saveJourney = (journey) => {
    setIsSaving(true);
    setTimeout(() => {
      const newSavedJourney = {
        id: Date.now(),
        from: journeyFrom,
        to: journeyTo,
        duration: journey.duration,
        legs: journey.legs,
        date: new Date().toLocaleString(),
        journeyId: journey.id,
      };

      setSavedJourneys((prev) => [newSavedJourney, ...prev]);
      setIsSaving(false);

      // Show success feedback
      alert("Journey saved to favorites!");
    }, 500);
  };

  // Get transport mode icon
  const getModeIcon = (modeName) => {
    const mode = modeName.toLowerCase();
    if (mode.includes("walk")) return <Footprints className="w-4 h-4" />;
    if (mode.includes("bus")) return <Bus className="w-4 h-4" />;
    if (
      mode.includes("train") ||
      mode.includes("tube") ||
      mode.includes("rail")
    )
      return <Train className="w-4 h-4" />;
    if (mode.includes("bike") || mode.includes("cycle"))
      return <Bike className="w-4 h-4" />;
    if (mode.includes("car") || mode.includes("taxi") || mode.includes("cab"))
      return <Car className="w-4 h-4" />;
    return <Navigation className="w-4 h-4" />;
  };

  // Get transport mode color
  const getModeColor = (modeName) => {
    const mode = modeName.toLowerCase();
    if (mode.includes("walk")) return "bg-gray-100 text-gray-700";
    if (mode.includes("bus")) return "bg-blue-100 text-blue-700";
    if (mode.includes("train") || mode.includes("rail"))
      return "bg-purple-100 text-purple-700";
    if (mode.includes("tube")) return "bg-red-100 text-red-700";
    if (mode.includes("bike") || mode.includes("cycle"))
      return "bg-green-100 text-green-700";
    if (mode.includes("car") || mode.includes("taxi"))
      return "bg-yellow-100 text-yellow-700";
    return "bg-indigo-100 text-indigo-700";
  };

  // Format duration
  const formatDuration = (durationSeconds) => {
    if (!durationSeconds || durationSeconds === 0) return "Instant";
    const minutes = Math.round(durationSeconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}m`
        : `${hours}h`;
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      // If it's already in HH:MM format, return as is
      if (
        typeof timeString === "string" &&
        timeString.match(/^\d{1,2}:\d{2}$/)
      ) {
        return timeString;
      }
      return "N/A";
    }
  };

  // Show detailed view of a journey
  const showJourneyDetails = (journey, index) => {
    setSelectedJourney({ ...journey, index: index + 1 });
    setShowDetailedView(true);
  };

  // Close detailed view
  const closeDetailedView = () => {
    setShowDetailedView(false);
    setSelectedJourney(null);
  };

  // Handle quick search from history
  const handleQuickSearch = (from, to) => {
    setJourneyFrom(from);
    setJourneyTo(to);
    // Use setTimeout to ensure state updates before planning
    setTimeout(() => planJourney(), 100);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion, type) => {
    if (type === "from") {
      setJourneyFrom(suggestion.name || suggestion.commonName);
      setSelectedFromLocation(suggestion);
      setShowFromSuggestions(false);
      setFromSuggestions([]);
    } else {
      setJourneyTo(suggestion.name || suggestion.commonName);
      setSelectedToLocation(suggestion);
      setShowToSuggestions(false);
      setToSuggestions([]);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        fromInputRef.current &&
        !fromInputRef.current.contains(event.target)
      ) {
        setShowFromSuggestions(false);
        setFromSuggestions([]);
      }
      if (toInputRef.current && !toInputRef.current.contains(event.target)) {
        setShowToSuggestions(false);
        setToSuggestions([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Pagination functions
  const totalPages = journeyResults?.journeys
    ? Math.ceil(journeyResults.journeys.length / itemsPerPage)
    : 1;

  const currentJourneys = journeyResults?.journeys
    ? journeyResults.journeys.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
    : [];

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Reset pagination when new results come in
  useEffect(() => {
    setCurrentPage(1);
  }, [journeyResults]);

  // Update the handlePlanJourney prop to use our new function
  useEffect(() => {
    if (handlePlanJourney) {
      handlePlanJourney.current = planJourney;
    }
  }, [handlePlanJourney, journeyFrom, journeyTo]);

  // Debounced suggestion fetching
  useEffect(() => {
    const handler = setTimeout(() => {
      if (journeyFrom && journeyFrom !== "current_location") {
        fetchSuggestions(journeyFrom, "from");
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [journeyFrom]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (journeyTo) {
        fetchSuggestions(journeyTo, "to");
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [journeyTo]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Journey Planner</h2>
        {savedJourneys.length > 0 && (
          <button
            onClick={() => setShowDetailedView(false)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Saved Journeys ({savedJourneys.length})
          </button>
        )}
      </div>

      {/* Quick Access Section */}
      {searchHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((search, index) => (
              <button
                key={index}
                onClick={() => handleQuickSearch(search.from, search.to)}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
              >
                {search.from} → {search.to}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {/* From Input */}
          <div className="relative" ref={fromInputRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Enter starting location (e.g. Orpington Station)"
                  value={journeyFrom}
                  onChange={(e) => setJourneyFrom(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => e.key === "Enter" && planJourney()}
                  onFocus={() => journeyFrom && setShowFromSuggestions(true)}
                />
                {showFromSuggestions && fromSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {fromSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() =>
                          handleSuggestionSelect(suggestion, "from")
                        }
                      >
                        <div className="font-medium text-gray-800">
                          {suggestion.name || suggestion.commonName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {suggestion.indicator}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    setJourneyFrom("current_location");
                    setSelectedFromLocation(null);
                  } else {
                    alert("Please enable location access first!");
                  }
                }}
                className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-sm whitespace-nowrap"
                aria-label="Use current location"
              >
                Use Current
              </button>
            </div>
          </div>

          {/* To Input */}
          <div className="relative" ref={toInputRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter destination (e.g. London Bridge)"
                value={journeyTo}
                onChange={(e) => setJourneyTo(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === "Enter" && planJourney()}
                onFocus={() => journeyTo && setShowToSuggestions(true)}
              />
              {showToSuggestions && toSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {toSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                      onClick={() => handleSuggestionSelect(suggestion, "to")}
                    >
                      <div className="font-medium text-gray-800">
                        {suggestion.name || suggestion.commonName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {suggestion.indicator}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Plan Button */}
          <button
            type="button"
            onClick={planJourney}
            disabled={journeyLoading || !journeyFrom || !journeyTo}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {journeyLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Planning Journey...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                Plan Journey
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {journeyError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 animate-fadeIn">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{journeyError}</p>
          </div>
        </div>
      )}

      {/* Journey Results */}
      {journeyResults && !journeyLoading && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Journey Results
            </h3>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600">
                {journeyResults.totalJourneys || 0} options found
              </span>
            </div>
          </div>

          {journeyResults.journeys && journeyResults.journeys.length > 0 ? (
            <div className="space-y-4">
              {currentJourneys.map((journey, index) => (
                <div
                  key={journey.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedJourney?.id === journey.id
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200"
                  }`}
                  onClick={() => showJourneyDetails(journey, index)}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-800">
                        Journey {journey.id}
                      </span>
                      {index === 0 && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Fastest
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-blue-600 font-medium">
                        {formatDuration(journey.duration)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    {journey.legs && journey.legs.length > 0 ? (
                      journey.legs.map((leg, legIndex) => {
                        const modeName = leg.mode?.name || "Transport";
                        const routeName = leg.routeName || "";
                        const destinationName = leg.to?.name || "Next location";
                        const duration = leg.duration || 0;

                        return (
                          <div
                            key={legIndex}
                            className="flex items-start space-x-2"
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getModeColor(
                                modeName
                              )}`}
                            >
                              {getModeIcon(modeName)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">
                                {modeName.toLowerCase().includes("walk")
                                  ? `Walk to ${destinationName}`
                                  : `Take ${modeName} ${
                                      routeName ? `(${routeName})` : ""
                                    } to ${destinationName}`}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{formatDuration(duration)}</span>
                                {leg.departureTime && (
                                  <span>• {formatTime(leg.departureTime)}</span>
                                )}
                                {leg.arrivalTime && (
                                  <span>
                                    • Arrive {formatTime(leg.arrivalTime)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No steps found for this journey.
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No journeys found</p>
              <p className="text-sm mt-1">
                Try different locations or check your input
              </p>
            </div>
          )}
        </div>
      )}

      {/* Map Section */}
      {showMap && journeyResults && !journeyLoading && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Map className="w-5 h-5 mr-2 text-blue-600" /> Journey Map
            </h3>
            <button
              onClick={() => setShowMap(false)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Hide Map
            </button>
          </div>
          <div className="h-96 w-full bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Map className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">
                Map visualization would appear here
              </p>
              <p className="text-sm text-gray-500 mt-2">
                In a real implementation, this would show the journey route on a
                map
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {journeyLoading && (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-gray-600">Finding the best routes for you...</p>
        </div>
      )}

      {/* Saved Journeys Section */}
      {savedJourneys.length > 0 && !journeyLoading && !journeyResults && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">
              Saved Journeys
            </h3>
            <span className="text-sm text-gray-600">
              {savedJourneys.length} saved
            </span>
          </div>

          <div className="space-y-3">
            {savedJourneys.map((saved, index) => (
              <div
                key={saved.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium text-gray-800">
                      {saved.from} → {saved.to}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">
                      {formatDuration(saved.duration)}
                    </span>
                    <button
                      onClick={() => handleQuickSearch(saved.from, saved.to)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                      aria-label="Plan this journey again"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Saved on {saved.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Journey View Modal */}
      {showDetailedView && selectedJourney && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                Journey {selectedJourney.index} Details
              </h3>
              <button
                onClick={closeDetailedView}
                className="p-1 rounded-full hover:bg-gray-100"
                aria-label="Close details"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Journey Summary */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">
                      From: {journeyFrom}
                    </p>
                    <p className="text-sm text-gray-500">To: {journeyTo}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-600 font-medium">
                    Total: {formatDuration(selectedJourney.duration)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {selectedJourney.legs?.length || 0} steps
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={() => saveJourney(selectedJourney)}
                disabled={isSaving}
                className="w-full mt-3 flex items-center justify-center space-x-2 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4" />
                    Save This Journey
                  </>
                )}
              </button>
            </div>

            {/* Journey Steps */}
            <div className="p-4">
              <h4 className="font-semibold text-gray-800 mb-3">Steps</h4>
              {selectedJourney.legs &&
              Array.isArray(selectedJourney.legs) &&
              selectedJourney.legs.length > 0 ? (
                <div className="space-y-3">
                  {selectedJourney.legs.map((leg, legIndex) => {
                    const modeName = leg.mode?.name || "Transport";
                    const routeName = leg.routeName || "";
                    const destinationName = leg.to?.name || "Next location";
                    const duration = leg.duration || 0;

                    return (
                      <div
                        key={legIndex}
                        className="border border-gray-100 rounded-lg p-3"
                      >
                        <div className="flex items-start space-x-2">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getModeColor(
                              modeName
                            )}`}
                          >
                            {getModeIcon(modeName)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">
                              {modeName.toLowerCase().includes("walk")
                                ? `Walk to ${destinationName}`
                                : `Take ${modeName} ${
                                    routeName ? `(${routeName})` : ""
                                  } to ${destinationName}`}
                            </p>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              <span>{formatDuration(duration)}</span>
                              {leg.departureTime && (
                                <span>• {formatTime(leg.departureTime)}</span>
                              )}
                              {leg.arrivalTime && (
                                <span>
                                  • Arrive {formatTime(leg.arrivalTime)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <p>No steps available for this journey.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
