// src/utils/bods.js
const BODS_API_KEY = import.meta.env.VITE_BODS_API_KEY;

export async function fetchBodsDatasetList(limit = 10) {
  const res = await fetch(
    `https://data.bus-data.dft.gov.uk/api/v1/dataset/?api_key=${BODS_API_KEY}&limit=${limit}`
  );
  if (!res.ok) throw new Error(`BODS API error: ${res.status}`);
  return res.json();
}

// Get a dataset by ID (to access the download URL)
export async function fetchBodsDataset(id) {
  const res = await fetch(
    `https://data.bus-data.dft.gov.uk/api/v1/dataset/${id}/?api_key=${BODS_API_KEY}`
  );
  if (!res.ok) throw new Error(`BODS dataset fetch failed: ${res.status}`);
  return res.json();
}

// Parse TransXChange XML
export async function parseTransXChange(xmlText, routeFilter) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  const services = [...xml.getElementsByTagName("Service")];
  const route = services.find(s =>
    s.querySelector("LineName")?.textContent === routeFilter
  );
  if (!route) throw new Error(`Route ${routeFilter} not found in dataset`);

  const journeyPattern = route.querySelector("JourneyPattern");
  const sections = journeyPattern.querySelectorAll("JourneyPatternSectionRef");

  // Extract timing links
  const stops = [];
  for (const sectionRef of sections) {
    const sectionId = sectionRef.textContent;
    const section = xml.querySelector(`JourneyPatternSection[id="${sectionId}"]`);
    const timingLinks = section.querySelectorAll("JourneyPatternTimingLink");
    timingLinks.forEach(link => {
      const stopRef = link.querySelector("To/StopPointRef")?.textContent;
      const stopName = link.querySelector("To/CommonName")?.textContent;
      const time = link.querySelector("To/ArrivalTime")?.textContent;
      stops.push({ id: stopRef, name: stopName, scheduledTime: time });
    });
  }

  return stops;
}
