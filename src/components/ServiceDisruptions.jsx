import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Bus,
  Train,
  Clock,
  MapPin,
  RefreshCw,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Search,
} from "lucide-react";

const TFL_APP_ID = import.meta.env.VITE_TFL_APP_ID;
const TFL_APP_KEY = import.meta.env.VITE_TFL_APP_KEY;

const ServiceDisruptionsTab = () => {
  const [disruptions, setDisruptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedMode, setSelectedMode] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  const modeConfig = {
    bus: { icon: Bus, color: "bg-blue-500", label: "Bus" },
    tube: { icon: Train, color: "bg-red-500", label: "Tube" },
    dlr: { icon: Train, color: "bg-teal-500", label: "DLR" },
    overground: { icon: Train, color: "bg-orange-500", label: "Overground" },
    "elizabeth-line": {
      icon: Train,
      color: "bg-purple-500",
      label: "Elizabeth Line",
    },
    tram: { icon: Train, color: "bg-green-500", label: "Tram" },
    "river-bus": { icon: Bus, color: "bg-blue-700", label: "River Bus" },
    "cable-car": { icon: Bus, color: "bg-pink-500", label: "Cable Car" },
  };

  // Severity options for filter
  const severityOptions = [
    { value: "all", label: "All Statuses" },
    { value: "good", label: "Good Service" },
    { value: "minor", label: "Minor Delays" },
    { value: "medium", label: "Medium Delays" },
    { value: "severe", label: "Severe Delays" },
    { value: "diverted", label: "Diverted" },
    { value: "part-suspended", label: "Part Suspended" },
    { value: "disrupted", label: "Service Disrupted" },
    { value: "planned", label: "Planned Closure" },
    { value: "special", label: "Special Service" },
  ];

  const fetchDisruptions = async () => {
    setLoading(true);
    setError(null);

    try {
      const modes = Object.keys(modeConfig).join(",");
      const url = `https://api.tfl.gov.uk/Line/Mode/${modes}/Status`;
      const params = new URLSearchParams({
        app_id: TFL_APP_ID,
        app_key: TFL_APP_KEY,
      });

      const response = await fetch(`${url}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const disruptionsWithMode = data.map((line) => ({
        ...line,
        mode: (line.modeName || "").toLowerCase().replace(/\s+/g, "-"),
      }));

      setDisruptions(disruptionsWithMode);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching disruptions:", err);
      setError("Failed to load service disruptions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisruptions();
  }, []);

  const normalizeDesc = (desc) => (desc || "").toString().trim().toLowerCase();

  const getSeverityInfo = (status = {}) => {
    const desc = normalizeDesc(status.statusSeverityDescription);
    const numeric = Number.isFinite(status.statusSeverity)
      ? status.statusSeverity
      : null;

    if (desc) {
      if (desc.includes("good")) {
        return {
          key: "good",
          color: "text-green-600 bg-green-50",
          Icon: CheckCircle,
          text: "Good Service",
        };
      }
      if (desc.includes("minor")) {
        return {
          key: "minor",
          color: "text-yellow-600 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Minor Delays",
        };
      }
      if (desc.includes("medium")) {
        return {
          key: "medium",
          color: "text-yellow-700 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Medium Delays",
        };
      }
      if (desc.includes("severe") && desc.includes("delays")) {
        return {
          key: "severe",
          color: "text-yellow-800 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Severe Delays",
        };
      }
      if (desc.includes("divert") || desc.includes("diversion")) {
        return {
          key: "diverted",
          color: "text-yellow-600 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Diverted",
        };
      }
      if (
        desc.includes("part") &&
        (desc.includes("suspend") || desc.includes("suspended"))
      ) {
        return {
          key: "part-suspended",
          color: "text-red-600 bg-red-50",
          Icon: AlertCircle,
          text: "Part Suspended",
        };
      }
      if (
        desc.includes("stopped") ||
        desc.includes("closed") ||
        desc.includes("suspended")
      ) {
        return {
          key:
            desc.includes("planned") || desc.includes("closure")
              ? "planned"
              : "disrupted",
          color: "text-red-600 bg-red-50",
          Icon: AlertCircle,
          text:
            desc.includes("planned") || desc.includes("closure")
              ? "Planned Closure"
              : "Service Disrupted",
        };
      }
      if (desc.includes("special")) {
        return {
          key: "special",
          color: "text-gray-700 bg-gray-50",
          Icon: Info,
          text: status.statusSeverityDescription || "Special Service",
        };
      }
      return {
        key: "other",
        color: "text-gray-600 bg-gray-50",
        Icon: Info,
        text: status.statusSeverityDescription || "Service Notice",
      };
    }

    switch (numeric) {
      case 10:
        return {
          key: "good",
          color: "text-green-600 bg-green-50",
          Icon: CheckCircle,
          text: "Good Service",
        };
      case 0:
        return {
          key: "special",
          color: "text-gray-700 bg-gray-50",
          Icon: Info,
          text: "Special Service",
        };
      case 1:
        return {
          key: "minor",
          color: "text-yellow-600 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Minor Delays",
        };
      case 2:
        return {
          key: "medium",
          color: "text-yellow-700 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Medium Delays",
        };
      case 3:
        return {
          key: "severe",
          color: "text-yellow-800 bg-yellow-50",
          Icon: AlertTriangle,
          text: "Severe Delays",
        };
      case 4:
      case 5:
      case 6:
      case 11:
      case 12:
      case 13:
      case 14:
        return {
          key: "disrupted",
          color: "text-red-600 bg-red-50",
          Icon: AlertCircle,
          text: "Service Disrupted",
        };
      default:
        return {
          key: "other",
          color: "text-gray-600 bg-gray-50",
          Icon: Info,
          text: "Service Notice",
        };
    }
  };

  const filteredDisruptions = disruptions.filter((d) => {
    // Mode filter
    if (selectedMode !== "all" && d.mode !== selectedMode) return false;

    // Search filter
    if (searchTerm && !d.name.toLowerCase().includes(searchTerm.toLowerCase()))
      return false;

    // Severity filter
    const status = d.lineStatuses?.[0] || {};
    const severityKey = getSeverityInfo(status).key;
    if (selectedSeverity !== "all" && severityKey !== selectedSeverity)
      return false;

    return true;
  });

  const modes = ["all", ...Object.keys(modeConfig)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Service Disruptions
              </h2>
              <p className="text-gray-600">
                Real-time transport service status across London
              </p>
            </div>
          </div>
          <button
            onClick={fetchDisruptions}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {lastUpdated && (
          <div className="mt-3 flex items-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <InfoIcon />
          <div>
            <h4 className="font-medium text-blue-900">Get Real-Time Alerts</h4>
            <p className="text-sm text-blue-700 mt-1">
              <strong>LBT Plus members</strong> can enable browser notifications
              for live disruption alerts. Go to{" "}
              <strong>Settings → Service Alerts</strong> to turn them on.
            </p>
          </div>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search lines (e.g., Victoria, 18, DLR)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="w-4 h-4 text-gray-500 hover:text-gray-700" />
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {severityOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Mode Filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {modes.map((mode) => {
            const isActive = selectedMode === mode;
            const config = modeConfig[mode] || {
              color: "bg-gray-500",
              label: "All Services",
            };

            return (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? `${config.color} text-white shadow-md`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {mode !== "all" && config.icon && (
                  <config.icon className="w-4 h-4" />
                )}
                <span>{mode === "all" ? "All Services" : config.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error / Loading / Empty / List — unchanged except using filteredDisruptions */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Unable to Load Data
          </h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDisruptions}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service disruptions...</p>
        </div>
      )}

      {!loading && !error && filteredDisruptions.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No matching services found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}

      {!loading && !error && filteredDisruptions.length > 0 && (
        <div className="space-y-4">
          {filteredDisruptions.map((line) => {
            const status = line.lineStatuses?.[0] || {};
            const {
              color: severityColor,
              Icon: SeverityIcon,
              text: severityText,
            } = getSeverityInfo(status);
            const modeInfo = modeConfig[line.mode] || modeConfig.bus;

            return (
              <div
                key={line.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div
                      className={`${modeInfo.color} w-12 h-12 rounded-lg flex items-center justify-center`}
                    >
                      <modeInfo.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">
                          {line.name}
                        </h3>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          {modeInfo.label}
                        </span>
                      </div>
                      <div
                        className={`flex items-center space-x-2 p-3 rounded-lg ${severityColor}`}
                      >
                        <SeverityIcon className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">{severityText}</p>
                          {status.reason && (
                            <p className="text-sm mt-1">{status.reason}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {status.validityPeriods?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600 flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Valid until:{" "}
                      {new Date(
                        status.validityPeriods[0].toDate
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <InfoIcon />
          <div>
            <h4 className="font-medium text-blue-900">About Service Status</h4>
            <p className="text-sm text-blue-700 mt-1">
              This information is provided by Transport for London (TfL) in
              real-time. Status levels range from "Good Service" (no issues) to
              "Severe Disruption" (major service impact).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoIcon = () => (
  <svg
    className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

export default ServiceDisruptionsTab;
