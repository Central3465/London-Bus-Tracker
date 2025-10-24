// src/components/RouteReplay.jsx
import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Clock, MapPin, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import { useUser } from "../contexts/UserContexts";
import BusMapComponent from "./BusMapComponent";

const TFL_APP_ID = import.meta.env.VITE_TFL_APP_ID;
const TFL_APP_KEY = import.meta.env.VITE_TFL_APP_KEY;

const RouteReplay = () => {
  const { subscription } = useUser();
  const hasPlus = subscription?.isActive;
  const navigate = useNavigate();
  const { theme } = useTheme();

  // 🔓 Rollout: unlocks for all on March 1, 2026
  const UNLOCK_DATE = new Date("2026-03-01T00:00:00");
  const isUnlockedForAll = Date.now() >= UNLOCK_DATE.getTime();
  const canAccess = hasPlus || isUnlockedForAll;

  const [lineId, setLineId] = useState("137");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [speed, setSpeed] = useState(2); // 1x, 2x, 4x

  const animationRef = useRef(null);
  const startTimeRef = useRef(null);

  // Fetch TfL timetable
  const fetchTimetable = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/bods/timetable?line=${lineId}&date=${date}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load timetable");
      setTimetable(data.stops);
      setCurrentStopIndex(0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !timetable || currentStopIndex >= timetable.length - 1) {
      setIsPlaying(false);
      return;
    }

    const animate = () => {
      const now = Date.now();
      if (!startTimeRef.current) {
        startTimeRef.current = now;
      }

      const elapsed = (now - startTimeRef.current) / 1000; // seconds
      const interval = 60 / speed; // seconds per stop (at 2x: 30s per stop)

      if (elapsed >= interval) {
        setCurrentStopIndex((prev) => {
          const next = prev + 1;
          if (next >= timetable.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          startTimeRef.current = now;
          return next;
        });
      }

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, timetable, currentStopIndex, speed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else if (timetable && currentStopIndex < timetable.length - 1) {
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStopIndex(0);
    startTimeRef.current = null;
  };

  const handleSpeedChange = (newSpeed) => {
    setSpeed(newSpeed);
    if (isPlaying) {
      startTimeRef.current = Date.now(); // reset timing
    }
  };

  // If no access
  if (!canAccess) {
    return (
      <div className="text-center py-12 max-w-2xl mx-auto">
        <div className="inline-block p-4 bg-blue-100 rounded-full mb-6">
          <Clock className="w-12 h-12 text-blue-600 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Route Replay</h2>
        <p className="text-gray-600 mb-6">
          Watch any bus route play back its scheduled journey—like a movie for
          bus nerds!
        </p>
        <div className="bg-green-50 text-green-800 px-4 py-3 rounded-lg mb-6 inline-block">
          <Clock className="w-4 h-4 inline mr-2" />
          Unlocks for everyone on <strong>March 1, 2026</strong>
        </div>
        <button
          onClick={() => navigate("/plus")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
        >
          Go Plus Now
        </button>
      </div>
    );
  }

  const currentStop = timetable?.[currentStopIndex];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Route Replay
        </h1>
        <p className="text-gray-600 mt-1">
          {hasPlus
            ? "Watch full scheduled journeys with speed control."
            : "Basic replay (last 7 days only)."}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bus Route
          </label>
          <input
            type="text"
            value={lineId}
            onChange={(e) => setLineId(e.target.value.toUpperCase())}
            placeholder="e.g. 137, N19, C2"
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            min={
              hasPlus
                ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
            }
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <button
        onClick={fetchTimetable}
        disabled={loading}
        className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
          loading
            ? "bg-gray-200 text-gray-500"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {loading ? "Loading Timetable..." : "Load Route"}
      </button>

      {error && (
        <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>
      )}

      {timetable && (
        <div className="space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={handlePlayPause}
              disabled={
                !timetable ||
                (currentStopIndex >= timetable.length - 1 && !isPlaying)
              }
              className={`p-2 rounded-full ${
                isPlaying
                  ? "bg-yellow-500 hover:bg-yellow-600"
                  : "bg-green-500 hover:bg-green-600"
              } text-white`}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {hasPlus && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Speed:</span>
                {[1, 2, 4].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`px-2 py-1 text-sm rounded ${
                      speed === s
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Stop Info */}
          {currentStop && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold">Now at: {currentStop.name}</div>
                <div className="text-sm text-gray-600">
                  Scheduled: {currentStop.scheduledTime}
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          <div className="text-sm text-gray-600">
            Stop {currentStopIndex + 1} of {timetable.length}
          </div>

          {/* Map */}
          <div className="border rounded-lg overflow-hidden h-96">
            <BusMapComponent
              buses={[]}
              userLocation={null}
              selectedStop={
                currentStop
                  ? { ...currentStop, naptanId: currentStop.id }
                  : null
              }
              showNearestStops={false}
              showJourneyPath={false}
              customMarkers={
                currentStop
                  ? [
                      {
                        id: "replay-bus",
                        lat: currentStop.lat,
                        lng: currentStop.lng,
                        line: lineId,
                        bearing: 0,
                      },
                    ]
                  : []
              }
            />
          </div>

          {/* Timeline (optional) */}
          <div className="text-xs text-gray-500">
            Tip: This shows the *scheduled* journey—not real-time data.
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteReplay;
