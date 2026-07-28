import { useState, useEffect, } from 'react';
import { createDataLookup, } from '../utils/places';
import { routesMatrixApi, } from '../config/maps';

// returns an array
function removeHomeDestDup(home, destinations){
  // 1. remove any destination that matches the home value
  const cleanIds = Object.keys(destinations).filter(destId => destId !== home.placeId);
  const filteredDests = cleanIds.map(cleanId => destinations[cleanId]);

  return filteredDests;
}

function createFetchJobs(homeId, destinations, activeTravelModes, travelCache){
  const jobs = [];
  const activeModeKeys = Object.keys(activeTravelModes).filter(k => activeTravelModes[k]);
  
  if (activeModeKeys.length === 0 || destinations.length === 0) return jobs;

  activeModeKeys.forEach(modeKey => {
    const missingDests = destinations.filter(
      // Safely check if the modeKey exists using optional chaining
      d => !travelCache.current.routes[homeId]?.[d.placeId]?.[modeKey]
    );

    if (missingDests.length > 0) {
      jobs.push({ modeKey, apiModeStr: modeKey.toUpperCase(), missingDests });
    }
  });

  return jobs;
}

async function fetchMissingRoutes(home, jobs, travelCache) {
  if (jobs.length === 0) return;
  const homeId = home.placeId;

  const promises = jobs.map(job => 
    routesMatrixApi.computeMatrix([home], job.missingDests, job.apiModeStr)
  );

  const results = await Promise.all(promises)


  // works because Promise.all preserves order 
  results.forEach((res, index) => {
    const job = jobs[index];
    const lookUp = createDataLookup(res);

    travelCache.current.routes[homeId] ??= {};

    job.missingDests.forEach((dest, destIndex) => {
      travelCache.current.routes[homeId][dest.placeId] ??= {};
      travelCache.current.routes[homeId][dest.placeId][job.modeKey] = lookUp[destIndex];
    });
  });

}

export function useDestMetrics(home, destinations, activeTravelModes, travelCache) {
  const [syncingDestData, setSyncingDestData] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    // 1. if niether is set skip
    if (!home || !destinations || Object.keys(destinations).length === 0) {
      setSyncingDestData(false);
      return;
    }

    const currentHomeId = home?.placeId;
    
    // 2. remove routes that go to themselves SALINAS -> SALINAS
    const cleanDestinations = removeHomeDestDup(home, destinations);

    if (!cleanDestinations || Object.keys(cleanDestinations).length === 0){
      setSyncingDestData(false);
      return;
    }

    // 3. create the jobs for the missing home -> dest travelMethod routes
    const jobs = createFetchJobs(currentHomeId, cleanDestinations, activeTravelModes, travelCache);

    if(jobs.length === 0){
      setSyncingDestData(false);
      return;
    }

    // 4. ASYNC EXECUTION: Only spin up async logic when there are jobs to compute
    const fetchDestData = async () => {
      try {
        setSyncingDestData(true);
  
        await fetchMissingRoutes(home, jobs, travelCache);
  
        if (isCurrentRequest) {
          setSyncingDestData(false);
        }
      } catch (err) {
        console.error("Destination initialization failed:", err);
        if (isCurrentRequest) {
          setSyncingDestData(false);
        }
      }
    };
  
    fetchDestData();
  
    return () => {
      isCurrentRequest = false;
    };
  }, [home, destinations, activeTravelModes]);

  return { syncingDestData };
}