// components/JourneyPlanner.jsx
import React from "react";
import { MapPin, Navigation, AlertTriangle } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Journey Planner</h2>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="space-y-4">
          {/* From Input */}
          <div className="relative">
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
                />
                {/* Autocomplete intentionally removed */}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    setJourneyFrom("current_location");
                  } else {
                    alert("Please enable location access first!");
                  }
                }}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                aria-label="Use current location"
              >
                Use Current Location
              </button>
            </div>
          </div>

          {/* To Input */}
          <div className="relative">
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
              />
              {/* Autocomplete intentionally removed */}
            </div>
          </div>

          {/* Plan Button */}
          <button
            type="button"
            onClick={handlePlanJourney}
            disabled={journeyLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {journeyLoading ? "Planning Journey..." : "Plan Journey"}
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Journey Results
          </h3>

          {journeyResults.journeys && journeyResults.journeys.length > 0 ? (
            <div className="space-y-4">
              {journeyResults.journeys.slice(0, 3).map((journey, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-800">
                      Journey {index + 1}
                    </span>
                    <span className="text-sm text-blue-600 font-medium">
                      {Math.round(journey.duration / 60)} min
                    </span>
                  </div>

                  <div className="space-y-2">
                    {journey.legs && Array.isArray(journey.legs) ? (
                      journey.legs.map((leg, legIndex) => {
                        // Safely access properties with fallbacks
                        const modeName = leg.mode?.name || "Unknown Mode";
                        const routeName = leg.routeName || "";
                        const destinationName =
                          leg.destination?.name || "Unknown Location";

                        // Fallback for duration
                        const durationMinutes = leg.duration
                          ? Math.round(leg.duration / 60)
                          : 0;

                        return (
                          <div
                            key={legIndex}
                            className="flex items-start space-x-2"
                          >
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                modeName.toLowerCase() === "walking"
                                  ? "bg-gray-200 text-gray-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {modeName.toLowerCase() === "walking"
                                ? "🚶"
                                : "🚌"}
                            </div>
                            <div>
                              <p className="text-sm">
                                {modeName.toLowerCase() === "walking"
                                  ? `Walk to ${destinationName}`
                                  : `Take ${modeName} ${
                                      routeName ? `(${routeName})` : ""
                                    } to ${destinationName}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {durationMinutes > 0
                                  ? `${durationMinutes} min`
                                  : "Instant"}
                              </p>
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
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Navigation className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No journeys found</p>
              <p className="text-sm mt-1">Try different locations</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JourneyPlanner;
