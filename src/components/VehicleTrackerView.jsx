import React, { useState, useEffect, useMemo} from "react";
import {
  Bus,
  Navigation,
  MapPin,
  Clock,
  Info,
  AlertTriangle,
  CalendarClock,
  Calendar,
  Car,
  Camera,
  Image,
  Users,
  Fuel,
  Wrench,
} from "lucide-react";
import BusMapComponent from "./BusMapComponent";

const VehicleTrackerView = ({
  vehicleIdInput,
  setVehicleIdInput,
  fetchVehicleDetails,
}) => {
  const [vehicleData, setVehicleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeFormat, setTimeFormat] = useState("minutes");
  const [busDetails, setBusDetails] = useState(null);
  const [busImage, setBusImage] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Remove duplicates (unique by naptanId) - represents the full route
  const uniqueVehicleData = Array.isArray(vehicleData)
    ? vehicleData.filter(
        (v, i, self) => i === self.findIndex((t) => t.naptanId === v.naptanId)
      )
    : [];

  // Extract stops with coordinates for the map
  const stopLocations = useMemo(() => {
    if (!Array.isArray(vehicleData)) return [];
    return vehicleData
      .filter((s) => s.stopPoint?.lat && s.stopPoint?.lon)
      .map((s) => ({
        lat: s.stopPoint.lat,
        lng: s.stopPoint.lon,
        stopName: s.stopPoint.commonName || s.stopPoint.name || s.naptanId,
      }));
  }, [vehicleData]);

  // Function to get the location of the NEXT STOP for the vehicle
  const getNextStopLocation = () => {
    if (
      !vehicleData ||
      !Array.isArray(vehicleData) ||
      vehicleData.length === 0
    ) {
      return null;
    }

    const nextStop = vehicleData[0]; // Assuming first item is the next stop
    if (
      nextStop &&
      nextStop.stopPoint &&
      typeof nextStop.stopPoint.lat === "number" &&
      typeof nextStop.stopPoint.lon === "number"
    ) {
      return {
        lat: nextStop.stopPoint.lat,
        lng: nextStop.stopPoint.lon,
      };
    }

    console.warn(
      "Coordinates for the next stop not found in the API response structure.",
      nextStop
    );
    return null;
  };

  const vehicleLocation = useMemo(() => {
    if (!Array.isArray(vehicleData) || vehicleData.length === 0) return null;
    const next = vehicleData[0];
    if (next?.stopPoint?.lat && next?.stopPoint?.lon) {
      return { lat: next.stopPoint.lat, lng: next.stopPoint.lon };
    }
    return null;
  }, [vehicleData]);

  // Function to format time based on the selected format
  const formatTime = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);

    if (timeFormat === "clock") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      // "minutes"
      const now = new Date();
      const arrivalTime = new Date(isoString);
      const diffMs = arrivalTime - now;
      const diffMins = Math.round(diffMs / 60000);

      if (diffMins < 0) {
        return `-${Math.abs(diffMins)} min ago`;
      } else if (diffMins === 0) {
        return "Due";
      } else {
        return `${diffMins} min`;
      }
    }
  };

  // Toggle time format
  const toggleTimeFormat = () => {
    setTimeFormat((prev) => (prev === "minutes" ? "clock" : "minutes"));
  };

  // Fetch bus details from bustimes.org API
  const fetchBusDetails = async (vehicleId) => {
    setLoadingDetails(true);

    try {
      // First, search for the vehicle by registration
      const response = await fetch(
        `https://bustimes.org/api/vehicles/?reg=${encodeURIComponent(
          vehicleId
        )}`
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const vehicle = data.results[0];
        const vehicleType = vehicle.vehicle_type;

        // Calculate age from fleet code year if available
        let age = "N/A";
        if (vehicle.fleet_code) {
          const yearMatch = vehicle.fleet_code.match(/\d{2}/);
          if (yearMatch) {
            const year = parseInt(yearMatch[0]);
            // Assuming 2-digit year (e.g., "20" for 2020)
            const fullYear = year > 20 ? 1900 + year : 2000 + year;
            age = new Date().getFullYear() - fullYear;
          }
        }

        // Create bus details object
        const details = {
          registration: vehicle.reg,
          model: vehicleType?.name || "Unknown Model",
          age: age !== "N/A" ? age : "N/A",
          manufacturer: vehicleType?.name?.split(" ")[0] || "Unknown",
          fuelType:
            vehicleType?.fuel?.charAt(0).toUpperCase() +
              vehicleType?.fuel?.slice(1) || "Unknown",
          capacity: "N/A", // Capacity not available in API
          wheelchairAccessible: false, // Not available in API
          airConditioning: false, // Not available in API
          wifi: false, // Not available in API
          usbCharging: vehicle.special_features?.includes("USB-A") || false,
          manufacturerYear: "N/A", // Not available in API
          fleetNumber: vehicle.fleet_number || "N/A",
          lastService: "N/A", // Not available in API
          nextService: "N/A", // Not available in API
          route: uniqueVehicleData[0]?.lineName || "N/A",
          operator: vehicle.operator?.name || "Unknown Operator",
          livery: vehicle.livery?.name || "Unknown Livery",
          withdrawn: vehicle.withdrawn || false,
        };

        setBusDetails(details);

        // Fetch image from Unsplash
        const unsplashResponse = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
            vehicleType?.name || vehicle.reg
          )}&client_id=${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}&per_page=1`
        );

        const unsplashData = await unsplashResponse.json();
        if (unsplashData.results && unsplashData.results.length > 0) {
          const imageUrl = unsplashData.results[0].urls.small;
          setBusImage(imageUrl);
        } else {
          // Fallback image
          setBusImage(
            `https://placehold.co/600x400?text=${encodeURIComponent(
              vehicleType?.name || vehicle.reg
            )}`
          );
        }
      } else {
        // If no vehicle found by registration, try by fleet number
        const fleetResponse = await fetch(
          `https://bustimes.org/api/vehicles/?fleet_code=${encodeURIComponent(
            vehicleId
          )}`
        );

        if (!fleetResponse.ok) {
          throw new Error(`API error: ${fleetResponse.status}`);
        }

        const fleetData = await fleetResponse.json();

        if (fleetData.results && fleetData.results.length > 0) {
          const vehicle = fleetData.results[0];
          const vehicleType = vehicle.vehicle_type;

          // Calculate age from fleet code year if available
          let age = "N/A";
          if (vehicle.fleet_code) {
            const yearMatch = vehicle.fleet_code.match(/\d{2}/);
            if (yearMatch) {
              const year = parseInt(yearMatch[0]);
              // Assuming 2-digit year (e.g., "20" for 2020)
              const fullYear = year > 20 ? 1900 + year : 2000 + year;
              age = new Date().getFullYear() - fullYear;
            }
          }

          // Create bus details object
          const details = {
            registration: vehicle.reg,
            model: vehicleType?.name || "Unknown Model",
            age: age !== "N/A" ? age : "N/A",
            manufacturer: vehicleType?.name?.split(" ")[0] || "Unknown",
            fuelType:
              vehicleType?.fuel?.charAt(0).toUpperCase() +
                vehicleType?.fuel?.slice(1) || "Unknown",
            capacity: "N/A", // Capacity not available in API
            wheelchairAccessible: false, // Not available in API
            airConditioning: false, // Not available in API
            wifi: false, // Not available in API
            usbCharging: vehicle.special_features?.includes("USB-A") || false,
            manufacturerYear: "N/A", // Not available in API
            fleetNumber: vehicle.fleet_number || "N/A",
            lastService: "N/A", // Not available in API
            nextService: "N/A", // Not available in API
            route: uniqueVehicleData[0]?.lineName || "N/A",
            operator: vehicle.operator?.name || "Unknown Operator",
            livery: vehicle.livery?.name || "Unknown Livery",
            withdrawn: vehicle.withdrawn || false,
          };

          setBusDetails(details);

          // Fetch image from Unsplash
          const unsplashResponse = await fetch(
            `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
              vehicleType?.name || vehicle.reg
            )}&client_id=${import.meta.env.VITE_UNSPLASH_ACCESS_KEY}&per_page=1`
          );

          const unsplashData = await unsplashResponse.json();
          if (unsplashData.results && unsplashData.results.length > 0) {
            const imageUrl = unsplashData.results[0].urls.small;
            setBusImage(imageUrl);
          } else {
            // Fallback image
            setBusImage(
              `https://placehold.co/600x400?text=${encodeURIComponent(
                vehicleType?.name || vehicle.reg
              )}`
            );
          }
        } else {
          setError(
            "No vehicle details found for this ID. Please try another ID."
          );
          setBusImage(
            `https://placehold.co/600x400?text=${encodeURIComponent(vehicleId)}`
          );
        }
      }
    } catch (err) {
      console.error("Error fetching bus details:", err);
      setError("Error fetching vehicle details. Please try again.");
      // Set fallback image
      setBusImage(
        `https://placehold.co/600x400?text=${encodeURIComponent(vehicleId)}`
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  const resolveStopNames = async (arrivals) => {
    return await Promise.all(
      arrivals.map(async (arrival) => {
        // Skip if we already have lat/lon
        if (arrival.stopPoint?.lat && arrival.stopPoint?.lon) {
          return arrival;
        }

        try {
          const res = await fetch(
            `https://api.tfl.gov.uk/StopPoint/${arrival.naptanId}`
          );
          if (!res.ok) return arrival;

          const stopData = await res.json();
          return {
            ...arrival,
            stopPoint: {
              ...stopData,
              commonName:
                stopData.commonName || stopData.name || arrival.naptanId,
            },
          };
        } catch (err) {
          console.warn("Failed to resolve stop:", arrival.naptanId, err);
          return arrival;
        }
      })
    );
  };

  const handleFetchVehicle = async () => {
    if (!vehicleIdInput.trim()) {
      setError("Please enter a Vehicle ID");
      setVehicleData(null);
      setBusDetails(null);
      setBusImage(null);
      return;
    }

    setError(null);
    setLoading(true);
    setVehicleData(null);
    setBusDetails(null);
    setBusImage(null);

    try {
      const { error: fetchError, data } = await fetchVehicleDetails(
        vehicleIdInput.trim()
      );
      if (fetchError) {
        setError(fetchError);
        return;
      }

      if (!data || !Array.isArray(data)) {
        setError("No vehicle data found.");
        return;
      }

      // Enrich stop names BEFORE setting state
      const enrichedData = await resolveStopNames(data);
      setVehicleData(enrichedData);

      // Fetch bus details after getting vehicle data
      fetchBusDetails(vehicleIdInput.trim());
    } catch (err) {
      console.error("Error in handleFetchVehicle:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate bus age
  const calculateAge = (year) => {
    const currentYear = new Date().getFullYear();
    return currentYear - year;
  };

  useEffect(() => {
    console.log("Vehicle data:", vehicleData);
    console.log("Stop locations:", stopLocations);
    console.log("Vehicle location:", vehicleLocation);
  }, [vehicleData, stopLocations, vehicleLocation]);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        Track a Specific Vehicle
      </h2>
      <p className="text-gray-600 mb-4">
        Enter the Vehicle ID (e.g., registration plate or fleet number) to track
        its live status and location.
      </p>

      <div className="flex space-x-2 mb-4">
        <input
          type="text"
          value={vehicleIdInput}
          onChange={(e) => setVehicleIdInput(e.target.value)}
          placeholder="Enter Vehicle ID (e.g., AB12CDE)"
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          onClick={handleFetchVehicle}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Tracking..." : "Track Vehicle"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Fetching vehicle details...</p>
        </div>
      )}

      {/* Display Vehicle Details */}
      {vehicleData && !loading && !error && (
        <div className="space-y-6">
          {/* Vehicle Info Header */}
          {uniqueVehicleData.length > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-14 h-14 bg-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-xl">
                  {uniqueVehicleData[0]?.lineName?.toUpperCase() || "N/A"}
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    To {uniqueVehicleData[0]?.destinationName || "N/A"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Vehicle ID: {uniqueVehicleData[0]?.vehicleId || "N/A"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Bus Details Section */}
          {busDetails && !loadingDetails && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                  <Bus className="w-5 h-5 mr-2 text-blue-600" /> Bus Details
                </h3>
              </div>

              <div className="p-4">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Bus Image */}
                  <div className="md:w-1/3">
                    {busImage ? (
                      <div className="rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={busImage}
                          alt={`Bus ${busDetails.model}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-2 bg-gray-50 text-center text-xs text-gray-500">
                          <Camera className="w-4 h-4 inline mr-1" />
                          Photo from Unsplash
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-100 border-2 border-dashed rounded-xl w-full h-48 flex items-center justify-center">
                        <Image className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                    {/* Warning message about image accuracy */}
                    <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-yellow-700">
                          <span className="font-medium">Note:</span> This image
                          may not show the exact vehicle as it's sourced from
                          Unsplash based on the bus model name.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bus Details */}
                  <div className="md:w-2/3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Car className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Registration</p>
                          <p className="font-medium">
                            {busDetails.registration}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Bus className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Model</p>
                          <p className="font-medium">{busDetails.model}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Age</p>
                          <p className="font-medium">
                            {busDetails.age !== "N/A"
                              ? `${busDetails.age} years`
                              : "N/A"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Wrench className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fleet Number</p>
                          <p className="font-medium">
                            {busDetails.fleetNumber}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Fuel className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Fuel Type</p>
                          <p className="font-medium">{busDetails.fuelType}</p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Operator</p>
                          <p className="font-medium">{busDetails.operator}</p>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mt-4">
                      <p className="text-sm text-gray-500 mb-2">Features:</p>
                      <div className="flex flex-wrap gap-2">
                        {busDetails.usbCharging && (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            USB Charging
                          </span>
                        )}
                        {busDetails.withdrawn && (
                          <span className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            Withdrawn
                          </span>
                        )}
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {busDetails.livery}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading Bus Details */}
          {loadingDetails && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span>Loading bus details...</span>
              </div>
            </div>
          )}

          {/* Time Format Toggle */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Time Format</span>
              <button
                onClick={toggleTimeFormat}
                className="flex items-center space-x-1 p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                {timeFormat === "minutes" ? (
                  <CalendarClock className="w-4 h-4" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span className="text-sm font-medium">
                  {timeFormat === "minutes"
                    ? "Switch to 18:00"
                    : "Switch to Minutes"}
                </span>
              </button>
            </div>
          </div>

          {/* Full Scheduled Route List (Full Route for the Vehicle) */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-blue-600" /> Full Route
              Schedule
            </h3>

            {uniqueVehicleData.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uniqueVehicleData.map((arrival, index) => (
                  <div
                    key={`${arrival.naptanId}-${index}`} // Use naptanId for uniqueness
                    className={`flex justify-between items-center p-3 border-b border-gray-200 last:border-b-0 ${
                      index === 0 ? "bg-blue-100" : "" // Highlight the first (next) stop
                    }`}
                  >
                    <span className="text-gray-700">
                      {arrival.stopPoint?.commonName ||
                        arrival.stopPoint?.name ||
                        arrival.naptanId ||
                        "Unknown Stop"}
                    </span>
                    <div className="flex space-x-3 text-sm">
                      <span className="text-gray-500">
                        Arr: {formatTime(arrival.expectedArrival) || "N/A"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p>No scheduled stops found for this vehicle ID.</p>
              </div>
            )}
          </div>

          {/* Map Section */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" /> Live Map
            </h3>
            {stopLocations.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <Info className="w-8 h-8 mx-auto mb-2" />
                <p>No stop locations available to display on map.</p>
              </div>
            ) : (
              <div className="h-96 w-full">
                <BusMapComponent
                  stops={stopLocations}
                  vehicleLocation={vehicleLocation}
                  userLocation={null}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleTrackerView;
