const TFL_APP_ID = import.meta.env.VITE_TFL_APP_ID;
const TFL_APP_KEY = import.meta.env.VITE_TFL_APP_KEY;
const TFL_API_BASE = "https://api.tfl.gov.uk";

// Environment variable for geocode.maps.co API key
// IMPORTANT: Store this in your .env file as REACT_APP_GEOCODE_API_KEY or VITE_GEOCODE_API_KEY
const GEOCODE_API_KEY = import.meta.env.VITE_GEOCODE_API_KEY; // Use VITE_ prefix for Vite

// Cache for API responses
const apiCache = new globalThis.Map();

const CACHE_DURATION = 60000; // 60 seconds

// Function to resolve a location string to coordinates using geocode.maps.co
const resolveLocation = async (query) => {
  if (!GEOCODE_API_KEY) {
    console.error(
      "Geocoding API key is missing. Please set VITE_GEOCODE_API_KEY in your environment."
    );
    throw new Error("Geocoding service is not configured correctly.");
  }

  if (!query.trim()) {
    throw new Error("Location query cannot be empty.");
  }

  const cacheKey = `geocode_${query}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached coordinates for: ${query}`);
    return cached.data;
  }

  try {
    console.log(`Geocoding query: ${query}`);
    const encodedQuery = encodeURIComponent(query);
    const geocodeUrl = `https://geocode.maps.co/search?q=${encodedQuery}&api_key=${GEOCODE_API_KEY}`;

    const response = await fetch(geocodeUrl);

    if (!response.ok) {
      // Try to get error details from the response body
      let errorDetails = `HTTP error! status: ${response.status}`;
      try {
        const errorBody = await response.json();
        errorDetails += ` - ${errorBody.error || errorBody.message || ""}`;
      } catch (e) {
        // If parsing JSON fails, just use the status
        console.warn("Could not parse geocoding error response:", e);
      }
      throw new Error(errorDetails);
    }

    const data = await response.json();
    console.log(`Geocoding response for "${query}":`, data);

    // geocode.maps.co returns an array of results
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`No geocoding results found for query: "${query}"`);
    }

    // Pick the first result (most relevant according to geocode.maps.co)
    const firstResult = data[0];
    const lat = parseFloat(firstResult.lat);
    const lon = parseFloat(firstResult.lon);

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error(`Invalid coordinates received for query: "${query}"`);
    }

    const resolvedLocation = {
      lat: lat,
      lon: lon,
      name: firstResult.display_name || query, // Use display_name if available, else fallback to query
    };

    // Cache the resolved coordinates
    apiCache.set(cacheKey, {
      data: resolvedLocation,
      timestamp: Date.now(),
    });

    return resolvedLocation;
  } catch (err) {
    console.error("Error resolving location using geocode.maps.co:", err);
    throw err; // Re-throw to be handled by fetchJourneyPlan
  }
};

export const fetchTflRouteSequence = async (lineId) => {
  const url = `https://api.tfl.gov.uk/Line/${encodeURIComponent(
    lineId
  )}/Route/Sequence/all`;
  const params = new URLSearchParams({
    app_id: TFL_APP_ID,
    app_key: TFL_APP_KEY,
  });

  try {
    const response = await fetch(`${url}?${params}`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`TfL route sequence not found for line: ${lineId}`);
        return { error: "Route not found on TfL", data: null };
      }
      throw new Error(`TfL API error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`TfL route sequence data for ${lineId}:`, data);
    return { error: null, data };
  } catch (err) {
    console.error("Error fetching TfL route sequence:", err);
    return { error: err.message, data: null };
  }
};

export const fetchTflBusSchedule = async (lineId) => {
  if (!lineId || !TFL_APP_ID || !TFL_APP_KEY) {
    console.error(
      "Line ID or TfL API credentials missing for schedule search."
    );
    return null;
  }

  const cacheKey = `tfl_schedule_${lineId}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached TfL schedule for: ${lineId}`);
    return cached.data;
  }

  try {
    console.log(`Fetching TfL schedule for line: ${lineId}`);
    const response = await fetch(
      `${TFL_API_BASE}/Search/BusSchedules?query=${encodeURIComponent(
        lineId
      )}&app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`
    );

    if (!response.ok) {
      // Check for 404 (not found) or other errors
      if (response.status === 404) {
        console.warn(`TfL schedule not found for line: ${lineId}`);
        return null; // Return null to indicate not found, handle in UI
      }
      throw new Error(`TfL API error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`TfL schedule data for ${lineId}:`, data);

    // Cache the response
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  } catch (err) {
    console.error("Error fetching TfL bus schedule:", err);
    // Return null or an empty object/array depending on how LiveBusView handles errors
    return null;
  }
};

export const fetchVehicleDetails = async (vehicleId) => {
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

// Fetch disruptions for a specific stop
export const fetchStopDisruptions = async (naptanId) => {
  const url = `https://api.tfl.gov.uk/StopPoint/${naptanId}/Disruption`;
  const params = new URLSearchParams({
    app_id: import.meta.env.VITE_TFL_APP_ID,
    app_key: import.meta.env.VITE_TFL_APP_KEY,
  });

  const res = await fetch(`${url}?${params}`);
  if (!res.ok) throw new Error(`TfL API error: ${res.status}`);
  return await res.json();
};

// Fetch vehicles on a specific route
export const fetchVehiclesOnRoute = async (lineId) => {
  try {
    const res = await fetch(
      `https://api.tfl.gov.uk/Line/${encodeURIComponent(lineId)}/Vehicle`
    );
    if (!res.ok) {
      const text = await res.text();
      return {
        error: `TfL Vehicle API error: ${res.status} – ${text}`,
        data: null,
      };
    }
    const data = await res.json();
    return { error: null, data: Array.isArray(data) ? data : [] };
  } catch (err) {
    return { error: err.message, data: null };
  }
};

// Fetch nearest bus stops to user's location with caching
export const fetchNearestStops = async (lat, lng, radius = 200) => {
  const url = `https://api.tfl.gov.uk/StopPoint?lat=${lat}&lon=${lng}&stopTypes=NaptanPublicBusCoachTram&radius=${radius}`;
  const cacheKey = `stops_${lat}_${lng}`;
  const cached = apiCache.get(cacheKey);

  // Check if we have a valid cached response
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${TFL_API_BASE}/StopPoint?lat=${lat}&lon=${lng}&stopTypes=NaptanPublicBusCoachTram&radius=500&app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const busStops =
      data.stopPoints?.filter(
        (stop) =>
          stop.stopType?.includes("Bus") || stop.stopType?.includes("Coach")
      ) || [];

    // Sort by distance
    const sortedStops = busStops.sort((a, b) => a.distance - b.distance);
    const topStops = sortedStops.slice(0, 10); // Top 10 nearest stops

    // Cache the response
    apiCache.set(cacheKey, {
      data: topStops,
      timestamp: Date.now(),
    });

    return topStops;
  } catch (err) {
    console.error("Error fetching nearest stops:", err);
    throw new Error("Failed to fetch nearby bus stops. Please try again.");
  }
};

// Fetch live arrivals for a specific stop with caching (TfL)
export const fetchLiveArrivals = async (stopId) => {
  if (!stopId) return [];

  const cacheKey = `arrivals_${stopId}`;
  const cached = apiCache.get(cacheKey);

  // Check if we have a valid cached response
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await fetch(
      `${TFL_API_BASE}/StopPoint/${stopId}/Arrivals?app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const arrivals = await response.json();
    // Sort by expected arrival time (soonest first)
    const sortedArrivals = arrivals.sort(
      (a, b) => new Date(a.expectedArrival) - new Date(b.expectedArrival)
    );

    // Cache the response
    apiCache.set(cacheKey, {
      data: sortedArrivals,
      timestamp: Date.now(),
    });

    return sortedArrivals;
  } catch (err) {
    console.error("Error fetching live arrivals:", err);
    throw new Error("Failed to fetch live bus data. Please try again.");
  }
};

// NEW FUNCTION: Fetch scheduled departures for a specific stop from bustimes.org
export const fetchScheduledDepartures = async (stopId) => {
  // stopId is likely the naptanId from TfL
  if (!stopId) return [];

  const cacheKey = `scheduled_departures_${stopId}`;
  const cached = apiCache.get(cacheKey);

  // Check if we have a valid cached response
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached scheduled departures for: ${stopId}`);
    return cached.data;
  }

  try {
    console.log(`Fetching scheduled departures for stop: ${stopId}`);
    // Attempt to use the TfL naptanId directly as the ATCO code in the bustimes.org query
    const response = await fetch(
      `https://bustimes.org/api/trips/?stops__atco_code=${encodeURIComponent(
        stopId
      )}`
    );

    if (!response.ok) {
      // A 404 might mean no trips found for this stop, which is okay.
      if (response.status === 404) {
        console.warn(
          `No scheduled trips found for stop ID (ATCO/Naptan): ${stopId}`
        );
        return []; // Return empty array instead of throwing
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Scheduled departures data for ${stopId}:`, data);

    // The API returns paginated results, we need the 'results' array
    const trips = data.results || [];
    console.log(`Found ${trips.length} scheduled trips for stop ${stopId}`);

    // Cache the response
    apiCache.set(cacheKey, {
      data: trips,
      timestamp: Date.now(),
    });

    return trips;
  } catch (err) {
    console.error("Error fetching scheduled departures:", err);
    // Return an empty array or null to handle gracefully in the UI
    return [];
  }
};

// Function to get detailed stop information from bustimes.org (if needed for mapping naptan->atco)
// This might be useful if naptanId != atco_code
export const fetchBustimesStopDetails = async (atcoCode) => {
  const cacheKey = `bustimes_stop_${atcoCode}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached bustimes.org stop details for: ${atcoCode}`);
    return cached.data;
  }

  try {
    console.log(`Fetching bustimes.org stop details for: ${atcoCode}`);
    const response = await fetch(`https://bustimes.org/api/stops/${atcoCode}/`);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Stop not found on bustimes.org: ${atcoCode}`);
        return null;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log(`bustimes.org stop details for ${atcoCode}:`, data);

    apiCache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
    });

    return data;
  } catch (err) {
    console.error("Error fetching bustimes.org stop details:", err);
    return null;
  }
};

export const fetchVehicleJourney = async (vehicleId) => {
  if (!vehicleId) {
    console.error("Vehicle ID is required to fetch vehicle journey.");
    return null; // Or throw an error
  }

  const cacheKey = `vehicle_journey_${vehicleId}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached vehicle journey for: ${vehicleId}`);
    return cached.data;
  }

  try {
    console.log(`Fetching vehicle journey for ID: ${vehicleId}`);
    const response = await fetch(
      `${TFL_API_BASE}/Vehicle/${vehicleId}/Arrivals?app_id=${TFL_APP_ID}&app_key=${TFL_APP_KEY}`
    );

    if (!response.ok) {
      // Check if the vehicle ID is not found (404) or another error occurred
      if (response.status === 404) {
        console.warn(
          `Vehicle ID ${vehicleId} not found or not currently tracked.`
        );
        // Return an empty array or a specific indicator instead of throwing
        // This prevents the detailed view from crashing if the ID is invalid
        return [];
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const journeyData = await response.json();
    console.log(`Vehicle journey data for ${vehicleId}:`, journeyData);

    // Cache the response
    apiCache.set(cacheKey, {
      data: journeyData,
      timestamp: Date.now(),
    });

    return journeyData;
  } catch (err) {
    console.error("Error fetching vehicle journey:", err);
    // Return an empty array or null to handle gracefully in the UI
    return [];
  }
};

// Fetch journey plan - Now uses resolveLocation from geocode.maps.co
export const fetchJourneyPlan = async (from, to, userLocation) => {
  if (!from.trim() || !to.trim()) {
    throw new Error("Please enter both 'From' and 'To' locations");
  }

  try {
    let fromCoords, toCoords;

    if (from === "current_location" && userLocation) {
      fromCoords = {
        lat: userLocation.lat,
        lon: userLocation.lng,
        name: "Your Location",
      };
    } else {
      // Use the new resolveLocation function
      fromCoords = await resolveLocation(from);
    }

    // Use the new resolveLocation function
    toCoords = await resolveLocation(to);

    console.log(
      `Resolved 'From': ${fromCoords.name} (${fromCoords.lat}, ${fromCoords.lon})`
    );
    console.log(
      `Resolved 'To': ${toCoords.name} (${toCoords.lat}, ${toCoords.lon})`
    );

    // Now call JourneyResults with coordinates
    const queryParams = new URLSearchParams({
      app_id: TFL_APP_ID,
      app_key: TFL_APP_KEY,
      mode: "bus,tube,dlr,overground",
      journeyPreference: "leastTime",
    });

    const journeyResponse = await fetch(
      `${TFL_API_BASE}/Journey/JourneyResults/${fromCoords.lat},${
        fromCoords.lon
      }/to/${toCoords.lat},${toCoords.lon}?${queryParams.toString()}`
    );

    if (!journeyResponse.ok) {
      throw new Error(`Journey API error! status: ${journeyResponse.status}`);
    }

    const journeyData = await journeyResponse.json();
    return journeyData;
  } catch (err) {
    console.error("Error fetching journey plan:", err);
    throw new Error(
      err.message || "Failed to find a journey plan. Please try again."
    );
  }
};

// The fetchAutocomplete function is removed as requested, so no need to update it here
// unless it's used elsewhere, in which case you'd need a different autocomplete source.
