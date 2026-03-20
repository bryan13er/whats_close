import { useState, useEffect, useRef } from 'react';
import { createDataLookup, prepRowData } from '../utils/places';
import { routesMatrixApi, placesApi } from '../config/maps';

// TODO: 3/20 think about a simple cache garabage collection strategy

// Helper 1: Fetches only missing place details and mutates the cache object
async function fetchMissingPlaces(missingDests, cacheRef) {
  if (missingDests.length === 0) return;
  
  const results = await Promise.all(
    missingDests.map(dest => placesApi.getPlaceDetails(dest.placeId))
  );
  
  // Write the results ot the cache
  results.forEach((res, i) => {
    cacheRef.current.places[missingDests[i].placeId] = res;
  });

  console.log("Fetched PLACES", missingDests);
}

// Helper 2: Fetches only missing routes for the current home and mutates the cache object
async function fetchMissingRoutes(home, missingDests, cacheRef) {
  if (missingDests.length === 0) return;
  
  const [driveRes, walkRes, transitRes] = await Promise.all([
    routesMatrixApi.computeMatrix(home, missingDests, "DRIVE"),
    routesMatrixApi.computeMatrix(home, missingDests, "WALK"),
    routesMatrixApi.computeMatrix(home, missingDests, "TRANSIT")
  ]);

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
    let isMounted = true;

    const loadTableData = async () => {
      try {
        if (!home || destinations.length === 0) {
          if (isMounted) setRows([]);
          return;
        }

        const currentHomeId = home.placeId;

        // 1. Identify what data is currently missing from our caches
        
        // places cache 
        const missingPlaces = destinations.filter(
          d => !cache.current.places[d.placeId]
        );
        
        // routes cache
        const missingRoutes = destinations.filter(
          d => !cache.current.routes[`${currentHomeId}_${d.placeId}`]
        );

        // 2. Fetch only the missing pieces concurrently
        await Promise.all([
          fetchMissingPlaces(missingPlaces, cache),
          fetchMissingRoutes(home, missingRoutes, cache)
        ]);

        // 3. Assemble the rows entirely from the local cache
        if (isMounted) {
          const newRows = destinations.map(dest => {
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
        }
      } catch (err) {
        console.error("Destination initialization failed:", err);
      }
    };

    loadTableData();

    return () => {
      isMounted = false;
    };
  }, [home, destinations]); // The effect now runs anytime home or dests change, but only fetches if cache is empty

  return { rows };
}