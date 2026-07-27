import { useState, useEffect, } from 'react';
import { createDataLookup, prepRowData } from '../utils/places';
import { routesMatrixApi, placesApi } from '../config/maps';

/**
 * @typedef {import('../types').Place} Place
 * @typedef {import('../types').Row} Row
 * @typedef {import('../types').PlaceDetails} PlaceDetails
 * @typedef {import('../types').MatrixCell} MatrixCell
 */

/**
 * @typedef {Object} DestinationstravelCache
 * Internal travelCache shared across calls within one provider lifetime.
 *
 * @property {Object<string, PlaceDetails>} places                                 - keyed by placeId
 * @property {Object<string, {drive: MatrixCell, walk: MatrixCell, transit: MatrixCell}>} routes - keyed by `${homeId}_${destId}`
 */

// TODO: 3/20 think about a simple travelCache garabage collection strategy


// Helper 2: Fetches only missing routes for the current home and mutates the travelCache object
async function fetchMissingRoutes(home, missingDests, travelCacheRef) {
  if (missingDests.length === 0) return;
  
  // passed as an array because function exepects an array
  const [driveRes, walkRes, transitRes] = await Promise.all([
    routesMatrixApi.computeMatrix([home], missingDests, "DRIVE"),
    routesMatrixApi.computeMatrix([home], missingDests, "WALK"),
    routesMatrixApi.computeMatrix([home], missingDests, "TRANSIT")
  ]);
  
  // this has to happen because the reurn of the matrix is in random order so we have 
  // recreate it as a object we can view by key
  const driveLookUp = createDataLookup(driveRes);
  const walkLookUp = createDataLookup(walkRes);
  const transitLookUp = createDataLookup(transitRes);
  const homeId = home.placeId;

  if (!travelCacheRef.current.routes[homeId]) {
    travelCacheRef.current.routes[homeId] = {};
  }
  
  // Write the results ot the travelCache
  missingDests.forEach((dest, index) => {
    travelCacheRef.current.routes[homeId][dest.placeId] = {
      drive: driveLookUp[index],
      walk: walkLookUp[index],
      transit: transitLookUp[index]
    };
  });
}

// TODO: travelCache garbaage collection
// function cleantravelCache(travelCacheRef) {
//   const routeKeys = Object.keys(travelCacheRef.current.routes);
//   if (routeKeys.length > MAX_travelCache_SIZE) {
//     // Remove the oldest 20 entries to make room
//     routeKeys.slice(0, 20).forEach(key => {
//       delete travelCacheRef.current.routes[key];
//     });
//   }
// }

/**
 * Fetches matrix data + place details for `destinations` relative to `home`,
 * caching results across renders so changing `home` or adding destinations
 * only fetches what's missing. Returns destRows ready for the table/cards.
 *
 * @param {Place|null} home
 * @param {Place[]} destinations
 * @returns {{ destRows: Row[] }}
 */
export function useDestinations(home, destinations, travelCache) {
  const [syncingDestData, setSyncingDestData] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchDestData = async () => {
      try {
        if (!home || Object.keys(destinations).length === 0) return;

        // FILTER: Remove any destination that matches the current home/origin ID i.e. Salinas to Salinas filter that out
        const cleanIds = Object.keys(destinations).filter(destId => destId !== home.placeId);
        const filteredDests = cleanIds.map(cleanId => destinations[cleanId]);

        // If after filtering there are no destinations left, clear the table
        if (filteredDests.length === 0) {
          setSyncingDestData(false);
          return;
        }

        const currentHomeId = home.placeId;
        // 1. Identify what data is currently missing from our travelCaches
        
        // set up a homeId history in useRef if there is none
        if (!travelCache.current.routes[currentHomeId]) {
          travelCache.current.routes[currentHomeId] = {};
        }

        // routes travelCache i.e distance and time 
        const missingRoutes = filteredDests.filter(
          d => !travelCache.current.routes[currentHomeId][d.placeId]
        );

        if (missingRoutes.length === 0){ 
          setSyncingDestData(false);
          return;
        }
        
        setSyncingDestData(true);

        // 2. Fetch only the missing pieces concurrently
        await Promise.all([
          fetchMissingRoutes(home, missingRoutes, travelCache)
        ]);

        if(isCurrentRequest){
          setSyncingDestData(false);
        }

      } catch (err) {
        console.error("Destination initialization failed:", err);
        if (isCurrentRequest) setSyncingDestData(false);
      }
    };

    fetchDestData();

    return () => {
      isCurrentRequest = false;
    };
  }, [home, destinations]); // The effect now runs anytime home or dests change, but only fetches if travelCache is empty

  return { syncingDestData };
}