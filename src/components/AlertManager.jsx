// src/components/AlertManager.jsx
import React, { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";

const AlertManager = ({ alerts, onDismiss }) => {
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = alerts.filter(a => !visibleAlerts.find(v => v.id === a.id));
    if (newAlerts.length > 0) {
      setVisibleAlerts(prev => [...prev, ...newAlerts]);

      // Auto-dismiss after 10s
      newAlerts.forEach(alert => {
        setTimeout(() => {
          onDismiss(alert.id);
        }, 10_000);
      });
    }
  }, [alerts]);

  const handleDismiss = (id) => {
    setVisibleAlerts(prev => prev.filter(a => a.id !== id));
    onDismiss(id);
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-xs">
      {visibleAlerts.map(alert => (
        <div key={alert.id} className="bg-white border-l-4 border-blue-500 rounded shadow-lg p-4">
          <div className="flex items-start">
            <Bell className="w-5 h-5 text-blue-600 mt-0.5 mr-2 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{alert.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
            </div>
            <button
              onClick={() => handleDismiss(alert.id)}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AlertManager;