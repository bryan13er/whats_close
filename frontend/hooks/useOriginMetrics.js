import { useEffect, useMemo, useState } from 'react';
import { createDataLookup, } from '../utils/places';
import { routesMatrixApi, } from '../config/maps';
import { cleanTimeRes } from '../utils/time';
import { getImperialDist } from '../utils/distance';

function getOrCreateMetrics(metrics, originId) {
  if (!metrics[originId]) {
    metrics[originId] = {
      drive: {
        avgDistance: 0,
        avgTime: 0,
        count: 0
      },
      walk: {
        avgDistance: 0,
        avgTime: 0,
        count: 0
      },
      transit: {
        avgDistance: 0,
        avgTime: 0,
        count: 0
      }
    };
  }

  return metrics[originId];
}

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

  // declare if not intalized for that homeId
  if (!travelCacheRef.current.routes[homeId]) {
    travelCacheRef.current.routes[homeId] = {};
  }

  // Write the results ot the travelCache
  missingDests.forEach((dest, index) => {
    travelCacheRef.current.routes[homeId][dest.placeId]= {
      drive: driveLookUp[index],
      walk: walkLookUp[index],
      transit: transitLookUp[index]
    };
  });
}

async function fetchMultipleMissingRoutes(originToDests, homeHistory, destHistory, travelCacheRef) {
  // TODO: not sure if i need to check length of active routes as well
  if (Object.keys(originToDests).length === 0 || (Object.keys(destHistory)).length === 0) return;

  // FIX: Define entries here so it is in scope for the logging loop below
  const entries = Object.entries(originToDests);

  //TODO: review if allSettled is the right call here
  // make sure to test that this all works now 
  const results = await Promise.allSettled(
    entries.map(([originKey, destIds]) => {
      const missingDests = destIds.map(destId => destHistory[destId]);
      return fetchMissingRoutes(homeHistory[originKey], missingDests, travelCacheRef);
    })
  );

  // 3. Print out the results line-by-line matching the originKey
  console.log("=== BATCH NETWORK RESULTS ===");
  results.forEach((result, index) => {
    const originId = entries[index][0];
    const destinationCount = entries[index][1].length;

    if (result.status === 'fulfilled') {
      console.log(`✅ Origin [${originId}]: Successfully synced ${destinationCount} routes.`);
    } else {
      // result.reason contains the raw Error object thrown by computeMatrix
      console.error(`❌ Origin [${originId}]: Failed batch fetch. Reason:`, result.reason);
    }
  });
  console.log("=============================");

}

export function useOriginMetrics(destinationId, homeHistory, destHistory, activeRoutes, travelCache) {
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  const [originMetrics, setOriginMetrics] = useState({}); // keyed by orign id 

  // upon review I find that given the maximum size of homeHistoyr and activeRoutes
  // its okay for the crossProductKeys to be recreated otherwise I would have to 
  // do some garabage collection or figure out how to create only the newest pairs
  const crossProductKeys = useMemo(() => {
    const homeIds = Object.keys(homeHistory);
   
    // exclude main destination if null/undefined
    const destIds = destinationId 
      ? [...Object.keys(activeRoutes), destinationId]
      : [...Object.keys(activeRoutes)];

    if (!homeIds.length || !destIds.length) return [];

    // creates cross product of homeIds and destIds
    return homeIds.flatMap(homeId =>
      destIds
        .filter(destId => destId !== homeId)
        .map(destId => `${homeId}::${destId}`)
    );
  }, [homeHistory, activeRoutes, destinationId]);

  //TODO: something about the data possibly becomeing stale need to look into this warning
  const missingCrossProductKeys = useMemo(() => {

    if(!crossProductKeys.length) return [];
    if(Object.keys(travelCache.current.routes).length === 0) return crossProductKeys;

    return crossProductKeys.filter(crossProductKey => {
      const [homeId, destId] = crossProductKey.split("::");
      return !travelCache.current.routes[homeId]?.[destId];
    });

  }, [crossProductKeys]);

  const originToDests = useMemo(() => {
    const acc = {};

    for (const originDestKey of missingCrossProductKeys) {
      const [originId, destId] = originDestKey.split("::");
      if (!(originId in acc)) {
        acc[originId] = [];
      }
      acc[originId].push(destId);
    }

    return acc;
  }, [missingCrossProductKeys]);

  useEffect(() => {
    // flag to preven race conditons when fetching data in 
    // useEffect https://react.dev/reference/react/useEffect#fetching-data-with-effects
    let isCurrentEffect = true;

    const writeMetrics = () => {
      if (!isCurrentEffect) return;
      const newMetrics = {};

      for(const crossProductKey of crossProductKeys){
        const[originId, destId] = crossProductKey.split("::");
        const route = travelCache.current.routes[originId]?.[destId];
        if (!route) continue;

        const currOriginMetrics = getOrCreateMetrics(newMetrics, originId);
        
        for (const mode of ["drive", "walk", "transit"]) {
          const data = route[mode];
          if (data?.condition !== "ROUTE_EXISTS") continue;
      
          const modeObj= currOriginMetrics[mode];
          modeObj.count += 1;
          modeObj.avgDistance += (data.distanceMeters - modeObj.avgDistance) / modeObj.count;
          modeObj.avgTime += (parseInt(data.duration) - modeObj.avgTime) / modeObj.count;
        }
      }

      console.log("newMetrics", newMetrics);
      setOriginMetrics(newMetrics);
      setSyncingMetrics(false);
    };

    const loadOriginMetrics = async () => {
      // If the map just loaded and there are no keys to process, do absolutely nothing.
      if (crossProductKeys.length === 0) return;

      // Guard clause: if the useMemo calculated 0 missing routes, bail out instantly
      if (Object.keys(originToDests).length === 0){
        // no network requests needed
        writeMetrics();
        return;
      }

      try {
        setSyncingMetrics(true);

        // Execute the external network calls
        await fetchMultipleMissingRoutes(
          originToDests, 
          homeHistory, 
          destHistory, 
          travelCache
        );

        // The background thread is done and the cache is full.
        // Toggle state to force the UI to re-render and read the fresh metrics.
        console.log("finished multi fetch");
        // write data after network requests
        writeMetrics();
      } catch (err) {
        console.error("Origin Metrics network batch failed", err);
        if (isCurrentEffect) setSyncingMetrics(false);
      }
    };

   
    loadOriginMetrics();

    return () => {
      isCurrentEffect = false;
    };
  }, [originToDests]); 
    // Expose the syncing status so the UI can render spinners if necessary
    return { syncingMetrics, originMetrics };
}