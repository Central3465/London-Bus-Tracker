// src/hooks/useCustomAlerts.js
import { useEffect, useRef } from "react";
import { fetchVehicleDetails } from "../utils/api";
import { fetchStopDisruptions } from "../utils/api";

export const useCustomAlerts = ({ fleet, favoriteStops, isEnabled, onAlert }) => {
  const activeAlertsRef = useRef(new Set());

  useEffect(() => {
    if (!isEnabled) return;

    const checkAlerts = async () => {
      const now = Date.now();
      const newAlerts = new Set();

      // 🔔 1. Check fleet vehicles
      for (const vehicle of fleet) {
        const { data, error } = await fetchVehicleDetails(vehicle.id);
        if (error || !data?.length) {
          if (vehicle.status === "In Service") {
            onAlert({
              id: `offline-${vehicle.id}`,
              title: `🚌 ${vehicle.id} went offline`,
              message: `It may be out of service or out of coverage.`,
            });
          }
          continue;
        }

        const latest = data[0];
        const expected = new Date(latest.expectedArrival);
        const scheduled = latest.scheduledArrival ? new Date(latest.scheduledArrival) : null;
        const route = latest.lineId?.toUpperCase() || "—";
        const destination = latest.destinationName || "—";

        let delayMinutes = null;
        if (scheduled) {
          delayMinutes = Math.round((expected - scheduled) / (60 * 1000));
        }

        if (delayMinutes >= 10) {
          const alertId = `delay-${vehicle.id}-${Math.floor(now / 600_000)}`;
          if (!activeAlertsRef.current.has(alertId)) {
            onAlert({
              id: alertId,
              title: `🚌 ${vehicle.id} delayed`,
              message: `Delayed by ${delayMinutes} mins on Route ${route} to ${destination}.`,
            });
            newAlerts.add(alertId);
          }
        }
      }

      // 🔔 2. Check favorite stops for disruptions
      for (const stop of favoriteStops) {
        try {
          const disruptions = await fetchStopDisruptions(stop.naptanId);
          const severe = disruptions.some(d =>
            d.description?.toLowerCase().includes("severe") ||
            d.statusSeverityDescription?.toLowerCase().includes("severe")
          );

          if (severe) {
            const alertId = `disruption-${stop.naptanId}`;
            if (!activeAlertsRef.current.has(alertId)) {
              onAlert({
                id: alertId,
                title: `⚠️ Disruption at ${stop.commonName}`,
                message: `Severe delays reported on routes serving this stop.`,
              });
              newAlerts.add(alertId);
            }
          }
        } catch (err) {
          console.warn("Failed to check disruptions for stop", stop.naptanId);
        }
      }

      // ✅ Update the ref
      const merged = new Set([...activeAlertsRef.current, ...newAlerts]);
      activeAlertsRef.current = merged;

      // Auto-expire old alerts after 10 mins
      setTimeout(() => {
        const fresh = new Set([...merged].filter(id => {
          const timePart = id.split('-').pop();
          const timeNum = parseInt(timePart, 10);
          return !isNaN(timeNum) && (now - timeNum * 600_000) < 600_000;
        }));
        activeAlertsRef.current = fresh;
      }, 600_000);
    };

    const interval = setInterval(checkAlerts, 60_000);
    checkAlerts();

    return () => clearInterval(interval);
  }, [isEnabled, fleet, favoriteStops]); // ✅ removed activeAlerts from deps

  // Optional: expose current alerts if needed elsewhere
  return { activeAlerts: activeAlertsRef.current };
};