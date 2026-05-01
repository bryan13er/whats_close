import { useState, useEffect, useRef } from 'react';
import { createDataLookup, prepRowData } from '../utils/places';
import { routesMatrixApi, placesApi } from '../config/maps';
import { logError } from '../lib/logger';

// TODO: 3/20 think about a simple cache garabage collection strategy

// Helper 1: Fetches only missing place details and mutates the cache object
async function fetchMissingPlaces(missingDests, cacheRef, signal) {
  if (missingDests.length === 0) return;

  const results = await Promise.all(
    missingDests.map(dest => placesApi.getPlaceDetails(dest.placeId, undefined, { signal }))
  );

  // Write the results ot the cache
  results.forEach((res, i) => {
    cacheRef.current.places[missingDests[i].placeId] = res;
  });

  console.log("Fetched PLACES", missingDests);
}

// Helper 2: Fetches only missing routes for the current home and mutates the cache object
async function fetchMissingRoutes(home, missingDests, cacheRef, signal) {
  if (missingDests.length === 0) return;

  const [driveRes, walkRes, transitRes] = await Promise.all([
    routesMatrixApi.computeMatrix(home, missingDests, "DRIVE", { signal }),
    routesMatrixApi.computeMatrix(home, missingDests, "WALK", { signal }),
    routesMatrixApi.computeMatrix(home, missingDests, "TRANSIT", { signal })
  ]);

  // this has to happen because the reurn of the matrix is in random order so we have
  // recreate it as a object we can view by key
  const driveLookUp = createDataLookup(driveRes);
  const walkLookUp = createDataLookup(walkRes);
  const transitLookUp = createDataLookup(transitRes);
  const homeId = home.placeId;

  // Write the results ot the cache
  missingDests.forEach((dest, index) => {
    cacheRef.current.routes[`${homeId}_${dest.placeId}`] = {
      drive: driveLookUp[index],
      walk: walkLookUp[index],
      transit: transitLookUp[index]
    };
  });

  console.log("Fetched ROUTES", missingDests)
}

// TODO: cache garbaage collection
// function cleanCache(cacheRef) {
//   const routeKeys = Object.keys(cacheRef.current.routes);
//   if (routeKeys.length > MAX_CACHE_SIZE) {
//     // Remove the oldest 20 entries to make room
//     routeKeys.slice(0, 20).forEach(key => {
//       delete cacheRef.current.routes[key];
//     });
//   }
// }

export function useDestinations(home, destinations) {
  const [rows, setRows] = useState([]);

  // The Cache: Persists for the lifetime of the component
  const cache = useRef({
    places: {}, // { "placeId": placeData }
    routes: {}  // { "homeId_destId": { drive, walk, transit } }
  });

  useEffect(() => {
    // AbortController scoped to this effect run. If the user changes home or
    // destinations while a fetch is in flight, the cleanup below aborts those
    // requests so their results can't overwrite fresher data later.
    const controller = new AbortController();
    const { signal } = controller;

    const loadTableData = async () => {
      try {
        if (!home || destinations.length === 0) {
          setRows([]);
          return;
        }

        // FILTER: Remove any destination that matches the current home/origin ID i.e. Salinas to Salinas filter that out
        const filteredDests = destinations.filter(d => d.placeId !== home.placeId);

        // If after filtering there are no destinations left, clear the table
        if (filteredDests.length === 0) {
          setRows([]);
          return;
        }

        const currentHomeId = home.placeId;
        // 1. Identify what data is currently missing from our caches

        // places cache i.e. ratings and price
        const missingPlaces = filteredDests.filter(
          d => !cache.current.places[d.placeId]
        );

        // routes cache i.e distance and time
        const missingRoutes = filteredDests.filter(
          d => !cache.current.routes[`${currentHomeId}_${d.placeId}`]
        );

        // 2. Fetch only the missing pieces concurrently
        await Promise.all([
          fetchMissingPlaces(missingPlaces, cache, signal),
          fetchMissingRoutes(home, missingRoutes, cache, signal)
        ]);

        // If the effect was cleaned up while we were awaiting, drop the result
        if (signal.aborted) return;

        // 3. Assemble the rows entirely from the local cache
        const newRows = filteredDests.map(dest => {
          // read the cahce here
          const placeData = cache.current.places[dest.placeId];
          const routeData = cache.current.routes[`${currentHomeId}_${dest.placeId}`];

          console.log(dest);

          return prepRowData(
            dest,
            routeData.drive,
            routeData.walk,
            routeData.transit,
            placeData
          );
        });

        setRows(newRows);
      } catch (err) {
        // AbortError is expected when deps change mid-flight — don't surface it as a failure
        if (signal.aborted || err?.name === 'AbortError') return;
        logError(err, {
          hook: 'useDestinations',
          homeId: home?.placeId,
          destCount: destinations?.length,
        });
      }
    };

    loadTableData();

    return () => {
      controller.abort();
    };
  }, [home, destinations]); // The effect now runs anytime home or dests change, but only fetches if cache is empty

  return { rows };
}
