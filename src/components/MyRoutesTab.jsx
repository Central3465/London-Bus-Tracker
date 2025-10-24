// src/components/MyRoutesTab.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Star,
  MapPin,
  Clock,
  RefreshCw,
  Bus,
  AlertTriangle,
  Zap,
  Home,
  Briefcase,
  Bell,
  BellOff,
  Plus as PlusIcon,
} from "lucide-react";
import { fetchLiveArrivals } from "../utils/api";
import { useNavigate } from "react-router-dom";
import { useUser } from "../contexts/UserContexts";

const MyRoutesTab = ({
  favorites = new Set(),
  theme,
  getInputTextColor,
  getInputBgAndBorder,
  userLocation,
}) => {
  const { subscription } = useUser();
  const hasPlus = subscription?.isActive;

  const [favoriteStops, setFavoriteStops] = useState([]);
  const [recentJourneys, setRecentJourneys] = useState([]);
  const [liveData, setLiveData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [commuteMode, setCommuteMode] = useState(false); // Plus-only
  const [homeStopId, setHomeStopId] = useState(
    localStorage.getItem("commuteHomeStop") || null
  );
  const [workStopId, setWorkStopId] = useState(
    localStorage.getItem("commuteWorkStop") || null
  );
  const [alerts, setAlerts] = useState(
    JSON.parse(localStorage.getItem("arrivalAlerts") || "{}")
  );
  const [shareLink, setShareLink] = useState("");
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const navigate = useNavigate();

  // Sync favorites from context
  useEffect(() => {
    const savedStops = JSON.parse(
      localStorage.getItem("favoriteStops") || "[]"
    );
    const currentFavs = savedStops.filter((stop) =>
      favorites.has(stop.naptanId)
    );
    setFavoriteStops(currentFavs);
    const journeys = JSON.parse(
      localStorage.getItem("recentJourneys") || "[]"
    ).slice(0, 3);
    setRecentJourneys(journeys);
  }, [favorites]);

  const fetchAllLiveArrivals = useCallback(async () => {
    if (favoriteStops.length === 0) return;
    setLoading(true);
    setError(null);
    const newLiveData = {};
    try {
      await Promise.all(
        favoriteStops.map(async (stop) => {
          try {
            const arrivals = await fetchLiveArrivals(stop.naptanId);
            newLiveData[stop.naptanId] = arrivals;
          } catch (err) {
            console.warn(`Failed to fetch arrivals for ${stop.naptanId}`, err);
            newLiveData[stop.naptanId] = [];
          }
        })
      );
      setLiveData(newLiveData);
    } catch (err) {
      setError("Failed to refresh live data");
    } finally {
      setLoading(false);
    }
  }, [favoriteStops]);

  useEffect(() => {
    if (favoriteStops.length > 0) {
      fetchAllLiveArrivals();
    }
  }, [favoriteStops, fetchAllLiveArrivals]);

  // Auto-refresh (Plus only)
  useEffect(() => {
    let interval;
    if (hasPlus && autoRefresh && favoriteStops.length > 0) {
      interval = setInterval(fetchAllLiveArrivals, 30_000);
    }
    return () => clearInterval(interval);
  }, [hasPlus, autoRefresh, fetchAllLiveArrivals, favoriteStops.length]);

  // Handle shared links (e.g., ?home=XXX&work=YYY)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const homeFromUrl = urlParams.get("home");
    const workFromUrl = urlParams.get("work");

    if (homeFromUrl && workFromUrl) {
      // Only set if user has Plus (or prompt upgrade)
      if (!hasPlus) {
        // Optional: show a one-time message
        if (!localStorage.getItem("commuteLinkPrompted")) {
          alert("This shared commute requires LBT Plus. Upgrade to view!");
          localStorage.setItem("commuteLinkPrompted", "true");
        }
        return;
      }

      // Set as commute stops
      setHomeStopId(homeFromUrl);
      setWorkStopId(workFromUrl);
      localStorage.setItem("commuteHomeStop", homeFromUrl);
      localStorage.setItem("commuteWorkStop", workFromUrl);
      if (window.history && window.history.replaceState) {
        const cleanUrl = new URL(window.location);
        cleanUrl.searchParams.delete("home");
        cleanUrl.searchParams.delete("work");
        window.history.replaceState(null, "", cleanUrl.toString());
      }
      setCommuteMode(true);
    }
  }, [hasPlus]); // Only run when hasPlus is known

  // 🔔 Predictive Alerts Polling (Plus only)
  useEffect(() => {
    if (!hasPlus) return;
    let alertInterval;
    const checkAlerts = () => {
      Object.entries(alerts).forEach(([stopId, enabled]) => {
        if (!enabled) return;
        const arrivals = liveData[stopId] || [];
        const nextArrival = arrivals[0];
        if (
          nextArrival &&
          nextArrival.expectedArrival &&
          Notification.permission === "granted"
        ) {
          const now = new Date();
          const arrival = new Date(nextArrival.expectedArrival);
          const diffMins = (arrival - now) / (1000 * 60);
          if (diffMins > 0 && diffMins <= 5) {
            // Prevent spam: only alert once per 10 mins per stop
            const lastAlert = localStorage.getItem(`lastAlert_${stopId}`);
            const canAlert =
              !lastAlert || now - new Date(lastAlert) > 10 * 60_000;
            if (canAlert) {
              new Notification("🚌 Bus Almost Here!", {
                body: `Next ${nextArrival.lineName} to ${
                  nextArrival.destinationName
                } is ${Math.ceil(diffMins)} min away.`,
                icon: "/icons/icon-default.png",
              });
              localStorage.setItem(`lastAlert_${stopId}`, now.toISOString());
            }
          }
        }
      });
    };
    alertInterval = setInterval(checkAlerts, 30_000); // check every 30s
    return () => clearInterval(alertInterval);
  }, [hasPlus, alerts, liveData]);

  const generateShareLink = () => {
    if (!homeStopId || !workStopId) {
      alert("Please set both Home and Work stops first.");
      return;
    }
    if (!hasPlus) {
      navigate("/plus");
      return;
    }

    const url = new URL(window.location);
    url.searchParams.set("home", homeStopId);
    url.searchParams.set("work", workStopId);
    setShareLink(url.toString());
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      // Optional: show toast (or just console.log for now)
      alert("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy link. Please copy manually.");
    }
  };

  const refresh = () => {
    fetchAllLiveArrivals();
  };

  const formatArrivalTime = (expectedArrival) => {
    const now = new Date();
    const arrival = new Date(expectedArrival);
    const diffMinutes = Math.floor((arrival - now) / (1000 * 60));
    if (diffMinutes <= 0) return "Due";
    if (diffMinutes === 1) return "1 min";
    return `${diffMinutes} mins`;
  };

  const calculateServiceStatus = (expectedArrival, scheduledArrival) => {
    if (!scheduledArrival) return { status: "On Time", color: "text-gray-600" };
    const expected = new Date(expectedArrival);
    const scheduled = new Date(scheduledArrival);
    const diffMinutes = Math.round((expected - scheduled) / (1000 * 60));
    if (diffMinutes <= -2) return { status: "Early", color: "text-green-600" };
    if (diffMinutes >= 2) return { status: "Delayed", color: "text-red-600" };
    return { status: "On Time", color: "text-gray-600" };
  };

  const getTextColor = (baseColor) => {
    switch (theme) {
      case "dark":
        return "text-gray-100";
      case "high-contrast":
        return "text-yellow-300";
      case "minimalist":
        return "text-gray-800";
      default:
        return baseColor || "text-gray-900";
    }
  };

  const getBgColor = () => {
    switch (theme) {
      case "dark":
        return "bg-gray-800";
      case "high-contrast":
        return "bg-black";
      case "minimalist":
        return "bg-white";
      default:
        return "bg-white";
    }
  };

  const getBorderColor = () => {
    switch (theme) {
      case "dark":
        return "border-gray-700";
      case "high-contrast":
        return "border-yellow-500";
      case "minimalist":
        return "border-gray-200";
      default:
        return "border-gray-200";
    }
  };

  const requestNotificationPermission = async () => {
    if (Notification.permission !== "granted") {
      const result = await Notification.requestPermission();
      if (result !== "granted") {
        alert("Notifications are required for arrival alerts.");
      }
    }
  };

  const toggleAlert = async (stopId) => {
    if (!hasPlus) {
      navigate("/plus");
      return;
    }
    await requestNotificationPermission();
    if (Notification.permission !== "granted") return;

    const newAlerts = { ...alerts, [stopId]: !alerts[stopId] };
    setAlerts(newAlerts);
    localStorage.setItem("arrivalAlerts", JSON.stringify(newAlerts));
  };

  const setCommuteStop = (type, stopId) => {
    if (type === "home") {
      localStorage.setItem("commuteHomeStop", stopId);
      setHomeStopId(stopId);
    } else {
      localStorage.setItem("commuteWorkStop", stopId);
      setWorkStopId(stopId);
    }
  };

  const clearCommuteStop = (type) => {
    if (type === "home") {
      localStorage.removeItem("commuteHomeStop");
      setHomeStopId(null);
    } else {
      localStorage.removeItem("commuteWorkStop");
      setWorkStopId(null);
    }
  };

  const getWalkTime = (stopLat, stopLon) => {
    if (!userLocation) return null;
    const R = 6371; // Earth radius in km
    const dLat = ((stopLat - userLocation.lat) * Math.PI) / 180;
    const dLon = ((stopLon - userLocation.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLocation.lat * Math.PI) / 180) *
        Math.cos((stopLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    const walkSpeedKmH = 5; // avg walking speed
    const walkMins = Math.ceil((distanceKm / walkSpeedKmH) * 60);
    return walkMins;
  };

  const homeStop = favoriteStops.find((s) => s.naptanId === homeStopId);
  const workStop = favoriteStops.find((s) => s.naptanId === workStopId);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-2xl font-bold ${getTextColor("text-gray-900")}`}>
          My Routes
        </h2>
        <div className="flex items-center gap-2">
          {hasPlus && (
            <>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  autoRefresh
                    ? "bg-blue-100 text-blue-700 border-blue-300"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                }`}
              >
                <Zap
                  className={`w-3 h-3 ${
                    autoRefresh ? "text-blue-600" : "text-gray-400"
                  }`}
                />
                Auto
              </button>
              <button
                onClick={() => setCommuteMode(!commuteMode)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                  commuteMode
                    ? "bg-purple-100 text-purple-700 border-purple-300"
                    : "bg-gray-100 text-gray-600 border-gray-300"
                }`}
              >
                <Briefcase className="w-3 h-3" />
                Commute
              </button>
            </>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              loading ? "opacity-50" : "hover:bg-gray-100"
            } ${getTextColor("text-gray-700")}`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* 🚇 Commute Mode Dashboard (Plus Only) */}
      {hasPlus && commuteMode && (homeStop || workStop) && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { type: "home", stop: homeStop, icon: Home },
            { type: "work", stop: workStop, icon: Briefcase },
          ].map(
            ({ type, stop, icon: Icon }) =>
              stop && (
                <div
                  key={type}
                  className={`${getBgColor()} ${getBorderColor()} border rounded-xl p-4`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-blue-600" />
                      <h4
                        className={`font-medium ${getTextColor(
                          "text-gray-900"
                        )}`}
                      >
                        {type === "home" ? "Home Stop" : "Work Stop"}
                      </h4>
                    </div>
                    <button
                      onClick={() => clearCommuteStop(type)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                  <p
                    className={`text-sm ${getTextColor("text-gray-700")} mb-2`}
                  >
                    {stop.commonName}
                  </p>
                  {userLocation && (
                    <p className="text-xs text-gray-500 mb-3">
                      🚶 {getWalkTime(stop.lat, stop.lon)} min walk
                    </p>
                  )}
                  {liveData[stop.naptanId]?.length > 0 ? (
                    <div className="space-y-1">
                      {liveData[stop.naptanId]
                        .slice(0, 2)
                        .map((arrival, idx) => {
                          const status = calculateServiceStatus(
                            arrival.expectedArrival,
                            arrival.scheduledArrival
                          );
                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-sm"
                            >
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                {arrival.lineName}
                              </span>
                              <span className={status.color}>
                                {formatArrivalTime(arrival.expectedArrival)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No live data</p>
                  )}
                </div>
              )
          )}
        </div>
      )}

      {/* 📍 Set Commute Stops (Plus Only) */}
      {hasPlus &&
        commuteMode &&
        favoriteStops.length > 0 &&
        !(homeStop && workStop) && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">
              Set your commute stops
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {!homeStop && (
                <div>
                  <label className="text-sm text-blue-700">Home Stop</label>
                  <select
                    onChange={(e) => setCommuteStop("home", e.target.value)}
                    className="w-full mt-1 text-sm border border-blue-300 rounded px-2 py-1"
                    value=""
                  >
                    <option value="">Select a stop</option>
                    {favoriteStops.map((stop) => (
                      <option key={stop.naptanId} value={stop.naptanId}>
                        {stop.commonName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {!workStop && (
                <div>
                  <label className="text-sm text-blue-700">Work Stop</label>
                  <select
                    onChange={(e) => setCommuteStop("work", e.target.value)}
                    className="w-full mt-1 text-sm border border-blue-300 rounded px-2 py-1"
                    value=""
                  >
                    <option value="">Select a stop</option>
                    {favoriteStops.map((stop) => (
                      <option key={stop.naptanId} value={stop.naptanId}>
                        {stop.commonName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      {/* 🔗 Share Commute Link (Plus Only) */}
      {hasPlus && commuteMode && homeStop && workStop && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-medium text-green-800 mb-2">
            Share Your Commute
          </h4>
          <p className="text-sm text-green-700 mb-3">
            Generate a link to share your Home → Work bus stops.
          </p>
          <div className="flex gap-2">
            <button
              onClick={generateShareLink}
              disabled={isGeneratingLink}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isGeneratingLink ? "Generating..." : "Generate Link"}
            </button>
            {shareLink && (
              <button
                onClick={copyToClipboard}
                className="text-sm bg-gray-600 text-white px-3 py-1.5 rounded hover:bg-gray-700"
              >
                Copy Link
              </button>
            )}
          </div>
          {shareLink && (
            <div className="mt-2 p-2 bg-white border border-gray-300 rounded text-xs text-gray-700 break-all">
              {shareLink}
            </div>
          )}
        </div>
      )}

      {/* 🚌 Favorite Stops */}
      <section className="mb-8">
        <h3
          className={`flex items-center gap-2 text-lg font-semibold mb-4 ${getTextColor(
            "text-gray-900"
          )}`}
        >
          <Star className="w-5 h-5 text-yellow-500" />
          Favorite Stops
        </h3>
        {favoriteStops.length === 0 ? (
          <div
            className={`${getBgColor()} ${getBorderColor()} border rounded-xl p-6 text-center`}
          >
            <Star className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className={getTextColor("text-gray-600")}>
              You haven’t favorited any stops yet.
            </p>
            <button
              onClick={() => navigate("/live")}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Go to Live Buses →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {favoriteStops.map((stop) => {
              const arrivals = liveData[stop.naptanId] || [];
              const displayArrivals = hasPlus
                ? arrivals.slice(0, 10)
                : arrivals.slice(0, 3);

              return (
                <div
                  key={stop.naptanId}
                  className={`${getBgColor()} ${getBorderColor()} border rounded-xl p-4`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4
                        className={`font-medium ${getTextColor(
                          "text-gray-900"
                        )}`}
                      >
                        {stop.commonName}
                      </h4>
                      <p
                        className={`text-sm ${getTextColor(
                          "text-gray-500"
                        )} flex items-center gap-1`}
                      >
                        <MapPin className="w-3 h-3" />{" "}
                        {stop.indicator || "Stop"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {hasPlus && (
                        <button
                          onClick={() => toggleAlert(stop.naptanId)}
                          className="p-1 rounded-full hover:bg-gray-200"
                        >
                          {alerts[stop.naptanId] ? (
                            <Bell className="w-4 h-4 text-green-600" />
                          ) : (
                            <BellOff className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/live?stop=${stop.naptanId}`)}
                        className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  {arrivals.length > 0 ? (
                    <div className="space-y-2">
                      {displayArrivals.map((arrival, idx) => {
                        const status = calculateServiceStatus(
                          arrival.expectedArrival,
                          arrival.scheduledArrival
                        );
                        return (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">
                                {arrival.lineName}
                              </span>
                              <span className={getTextColor("text-gray-700")}>
                                to {arrival.destinationName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={status.color}>
                                {status.status}
                              </span>
                              <span className="font-medium">
                                {formatArrivalTime(arrival.expectedArrival)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {!hasPlus && arrivals.length > 3 && (
                        <button
                          onClick={() => navigate("/plus")}
                          className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          Unlock all arrivals with LBT Plus
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className={getTextColor("text-gray-500 text-sm")}>
                      No live arrivals right now
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Journeys */}
      {recentJourneys.length > 0 && (
        <section>
          <h3
            className={`flex items-center gap-2 text-lg font-semibold mb-4 ${getTextColor(
              "text-gray-900"
            )}`}
          >
            <Clock className="w-5 h-5 text-blue-500" />
            Recent Journeys
          </h3>
          <div className="space-y-3">
            {recentJourneys.map((journey, idx) => (
              <div
                key={idx}
                className={`${getBgColor()} ${getBorderColor()} border rounded-lg p-3 flex justify-between items-center`}
              >
                <div>
                  <p className={`font-medium ${getTextColor("text-gray-900")}`}>
                    {journey.from} → {journey.to}
                  </p>
                  <p className={`text-sm ${getTextColor("text-gray-500")}`}>
                    {new Date(journey.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <Bus className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MyRoutesTab;
