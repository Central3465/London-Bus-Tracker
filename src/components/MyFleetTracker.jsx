// src/components/MyFleetTracker.jsx
import React, { useState, useEffect } from "react";
import {
  Star,
  Trash2,
  Bus,
  Zap,
  RefreshCw,
  Lock,
  CreditCard,
} from "lucide-react";
import { fetchVehicleDetails } from "../utils/api";
import { useUser } from "../contexts/UserContexts";
import { useNavigate } from "react-router-dom";

const MyFleetTracker = () => {
  const { subscription, user } = useUser();
  const hasPlus = subscription?.isActive;
  const navigate = useNavigate();

  const [vehicleInput, setVehicleInput] = useState("");
  const [fleet, setFleet] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(null);

  // Check notification permission on mount
  useEffect(() => {
    if (hasPlus && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, [hasPlus]);

  // Request notification permission (if not already granted)
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
  };

  // Load saved fleet from localStorage
  useEffect(() => {
    if (!hasPlus) return;
    const saved = localStorage.getItem("myFleet");
    if (saved) {
      try {
        setFleet(JSON.parse(saved));
      } catch (e) {
        console.warn("Failed to parse myFleet");
      }
    }
  }, [hasPlus]);

  // Background checker: every 45s for Plus users
  useEffect(() => {
    if (!hasPlus || fleet.length === 0) return;

    const interval = setInterval(async () => {
      const updated = await Promise.all(
        fleet.map(async (veh) => {
          const { data, error } = await fetchVehicleDetails(veh.id);
          const wasOffline = veh.status === "Offline";
          if (error || !data?.length) {
            return { ...veh, status: "Offline", lastSeen: Date.now() };
          }

          const latest = data[0];
          const newStatus = "In Service";

          // 🔔 Trigger notification if it just came online
          if (
            wasOffline &&
            newStatus === "In Service" &&
            notificationPermission === "granted"
          ) {
            new Notification(`🚌 ${veh.id} is back online!`, {
              body: `Now on Route ${latest.lineId?.toUpperCase()} to ${
                latest.destinationName
              }`,
              icon: "/assets/Bus.png",
            });
          }

          return {
            id: veh.id,
            route: latest.lineId?.toUpperCase() || "—",
            destination: latest.destinationName || "—",
            status: newStatus,
            lastSeen: Date.now(),
            location: latest,
          };
        })
      );
      setFleet(updated);
      localStorage.setItem("myFleet", JSON.stringify(updated));
    }, 45_000);

    return () => clearInterval(interval);
  }, [hasPlus, fleet, notificationPermission]);

  const saveFleetToStorage = (updatedFleet) => {
    setFleet(updatedFleet);
    localStorage.setItem("myFleet", JSON.stringify(updatedFleet));
  };

  const refreshFleet = async () => {
    setLoading(true);
    const updated = await Promise.all(
      fleet.map(async (veh) => {
        const { data, error } = await fetchVehicleDetails(veh.id);
        if (error || !data?.length) {
          return { ...veh, status: "Offline", lastSeen: Date.now() };
        }
        const latest = data[0];
        return {
          id: veh.id,
          route: latest.lineId?.toUpperCase() || "—",
          destination: latest.destinationName || "—",
          status: "In Service",
          lastSeen: Date.now(),
          location: latest,
        };
      })
    );
    saveFleetToStorage(updated);
    setLoading(false);
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!vehicleInput.trim()) return;

    if (!hasPlus) {
      setError("Save vehicles to your fleet with Travelut Plus!");
      return;
    }

    setLoading(true);
    setError(null);
    const cleanId = vehicleInput.trim().toUpperCase();

    // ✅ Allow adding even if not found / offline
    const { data, error } = await fetchVehicleDetails(cleanId);

    let newVehicle;
    if (error || !data?.length) {
      // Still add it, but mark as offline
      newVehicle = {
        id: cleanId,
        route: "—",
        destination: "—",
        status: "Offline",
        lastSeen: Date.now(),
        location: null,
      };
    } else {
      const latest = data[0];
      newVehicle = {
        id: cleanId,
        route: latest.lineId?.toUpperCase() || "—",
        destination: latest.destinationName || "—",
        status: "In Service",
        lastSeen: Date.now(),
        location: latest,
      };
    }

    const updated = [...fleet, newVehicle].filter(
      (v, i, arr) => arr.findIndex((x) => x.id === v.id) === i
    );

    saveFleetToStorage(updated);
    setVehicleInput("");
    setLoading(false);

    // Request notification permission on first add
    if (notificationPermission !== "granted") {
      requestNotificationPermission();
    }
  };

  const handleRemove = (id) => {
    const updated = fleet.filter((v) => v.id !== id);
    saveFleetToStorage(updated);
  };

  const getVehicleIcon = (route) => {
    if (route?.startsWith("N"))
      return <Bus className="w-4 h-4 text-purple-600" />;
    if (["98", "134", "312"].includes(route))
      return <Zap className="w-4 h-4 text-green-500" />;
    return <Bus className="w-4 h-4" />;
  };

  // 🔒 LOCKED VIEW for non-Plus users
  if (!hasPlus) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
          <Lock className="w-10 h-10 text-blue-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-800">My Fleet Tracker</h2>
          <p className="text-gray-600 text-sm">
            Save your favorite buses and get live alerts when they’re in
            service.
          </p>
          <p className="text-gray-500 text-xs mt-1">
            🔔 Includes real-time notifications & background tracking.
          </p>
        </div>
        <button
          onClick={() => navigate("/plus")}
          className="flex items-center justify-center gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-all transform hover:scale-[1.02]"
        >
          <CreditCard className="w-4 h-4" />
          Unlock with Travelut Plus
        </button>
        <p className="text-xs text-gray-400 mt-2">
          Already subscribed? Refresh or check your account.
        </p>
      </div>
    );
  }

  // ✅ PLUS VIEW
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Star className="text-yellow-500" /> My Fleet
        </h2>
        <p className="text-gray-600">
          Track your favorite buses by vehicle ID (e.g., <code>LX62 AEU</code>).
        </p>
        {notificationPermission !== "granted" && (
          <p className="text-sm text-blue-600 mt-1">
            🔔 Enable notifications to get alerts when your buses come online!
          </p>
        )}
      </div>

      <form onSubmit={handleAddVehicle} className="flex gap-2">
        <input
          type="text"
          value={vehicleInput}
          onChange={(e) => setVehicleInput(e.target.value)}
          placeholder="Enter vehicle ID (e.g. LX62 AEU)"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add"}
        </button>
      </form>

      {error && <div className="text-red-500 text-sm">{error}</div>}

      {fleet.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bus className="w-12 h-12 mx-auto mb-3 opacity-60" />
          <p>Your fleet is empty.</p>
          <p className="text-sm mt-1">Add a vehicle to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fleet.map((veh) => (
            <div
              key={veh.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                {getVehicleIcon(veh.route)}
                <div>
                  <div className="font-mono font-bold">{veh.id}</div>
                  <div className="text-sm text-gray-600">
                    Route {veh.route} → {veh.destination}
                  </div>
                  <div className="text-xs mt-1">
                    <span
                      className={
                        veh.status === "In Service"
                          ? "text-green-600"
                          : "text-gray-400"
                      }
                    >
                      {veh.status}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(veh.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label="Remove from fleet"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {fleet.length > 0 && (
        <button
          onClick={refreshFleet}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh fleet
        </button>
      )}
    </div>
  );
};

export default MyFleetTracker;