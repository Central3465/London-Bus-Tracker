// server/utils/bodsParser.js
import axios from "axios"
import { DOMParser } from "@xmldom/xmldom";

const BODS_API_KEY = process.env.BODS_API_KEY;

export async function fetchBodsDatasetList(limit = 5) {
  const res = await axios.get(
    `https://data.bus-data.dft.gov.uk/api/v1/dataset/`,
    {
      params: { api_key: BODS_API_KEY, limit },
    }
  );
  return res.data;
}

export async function fetchBodsDataset(id) {
  const res = await axios.get(
    `https://data.bus-data.dft.gov.uk/api/v1/dataset/${id}/`,
    {
      params: { api_key: BODS_API_KEY },
    }
  );
  return res.data;
}

export function parseTransXChange(xmlText, lineFilter) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "application/xml");

  // Find service with matching LineName
  const services = Array.from(xml.getElementsByTagName("Service"));
  const service = services.find(
    (s) => s.querySelector("LineName")?.textContent === lineFilter
  );

  if (!service) throw new Error(`Route ${lineFilter} not found`);

  // Get first JourneyPattern
  const journeyPattern = service.querySelector("JourneyPattern");
  if (!journeyPattern) throw new Error("No journey pattern found");

  const patternSectionRefs = Array.from(
    journeyPattern.querySelectorAll("JourneyPatternSectionRef")
  );
  const sectionIds = patternSectionRefs.map((ref) => ref.textContent);

  // Load all referenced sections
  const allStops = [];
  for (const sectionId of sectionIds) {
    const section = xml.querySelector(`JourneyPatternSection[id="${sectionId}"]`);
    if (!section) continue;

    const links = Array.from(section.querySelectorAll("JourneyPatternTimingLink"));
    for (const link of links) {
      const to = link.querySelector("To");
      if (!to) continue;

      const stopPointRef = to.querySelector("StopPointRef")?.textContent;
      const commonName = to.querySelector("CommonName")?.textContent;
      const arrivalTime = to.querySelector("ArrivalTime")?.textContent;

      if (stopPointRef && commonName && arrivalTime) {
        allStops.push({
          id: stopPointRef,
          name: commonName,
          scheduledTime: arrivalTime,
          // Note: TransXChange doesn't include lat/lng in timing links!
          // You'll need to cross-reference with NaPTAN or use TfL stops
        });
      }
    }
  }

  return allStops;
}
