import { useState, useEffect, } from 'react';
import { createDataLookup, } from '../utils/places';
import { routesMatrixApi, } from '../config/maps';

// Excludes A::A NOT A::B, B::A
// TODO:
// New origin added → only check that one new home against all existing destinations. Every already-tracked home×dest pair is untouched, so re-checking them is wasted work.
// New destination added → only check that one new destination against all existing homes. Same reasoning, reversed.
function getMissingRoutes(homes, destinations, activeTravelModes, travelCache) {
  const missingRoutes = {};
  const activeModeKeys = Object.keys(activeTravelModes).filter(k => activeTravelModes[k]);
  const homeIds = Object.keys(homes);
  const destIds = Object.keys(destinations);
  let length = 0;

  if (activeModeKeys.length === 0 || homeIds.length === 0 || destIds.length === 0) {
    return null;
  }

  for (const homeId of homeIds) {
    for (const destId of destIds) {
      if (destId === homeId) continue; // strip self-pairs, same as generateCrossProduct did

      for (const modeKey of activeModeKeys) {
        if (!travelCache.current.routes[homeId]?.[destId]?.[modeKey]) {
          missingRoutes[modeKey] ??= {};
          missingRoutes[modeKey][homeId] ??= [];
          missingRoutes[modeKey][homeId].push(destId);
          length += 1;
        }
      }
    }
  }

  if (length > 0){
    return missingRoutes
  } else{
    return null;
  }
}

// writes to cache and executes the fetch
async function executeFetchJobs(missingRoutes, homeHistory, destHistory, travelCache){
  const allFetches = [];
  for (const [modeKey, homeMap] of Object.entries(missingRoutes)) {
    for (const [homeId, destIds] of Object.entries(homeMap)) {
      const promise = (async () => {
        const homeObj = homeHistory[homeId];
        const destObjs = destIds.map(id => destHistory[id]);
        const res = await routesMatrixApi.computeMatrix([homeObj], destObjs, modeKey.toUpperCase());
        const lookUp = createDataLookup(res);

        travelCache.current.routes[homeId] ??= {};
        destIds.forEach((destId, index) => {
          travelCache.current.routes[homeId][destId] ??= {};
          travelCache.current.routes[homeId][destId][modeKey] = lookUp[index];
        });
      })();
      allFetches.push(promise);
    }
  }
  await Promise.allSettled(allFetches);
}

function computeMatrixMetrics(homes, destinations, activeTravelModes, travelCache) {
  const metrics = {};

  const homeIds = Object.keys(homes);
  const destIds = Object.keys(destinations);
  const activeModeKeys = Object.keys(activeTravelModes).filter(k => activeTravelModes[k]);

  if (homeIds.length === 0 || destIds.length === 0 || activeModeKeys.length === 0) {
    return metrics
  }

  for (const homeId of homeIds) {
    const routesForHome = travelCache.current.routes[homeId];
    if (!routesForHome) continue;

    for (const destId of destIds) {
      if (destId === homeId) continue;

      const routeForDest = routesForHome[destId];
      if (!routeForDest) continue;

      for (const modeKey of activeModeKeys) {
        const routeData = routeForDest[modeKey];
        if (!routeData || routeData.condition !== "ROUTE_EXISTS") continue;

        metrics[homeId] ??= {};
        metrics[homeId][modeKey] ??= { avgDistance: 0, avgTime: 0, count: 0 };

        const modeObj = metrics[homeId][modeKey];
        const distance = routeData.distanceMeters || 0;
        const duration = parseInt(routeData.duration, 10) || 0;

        modeObj.count += 1;
        modeObj.avgDistance += (distance - modeObj.avgDistance) / modeObj.count;
        modeObj.avgTime += (duration - modeObj.avgTime) / modeObj.count;
      }
    }
  }

  return metrics;
}

export function useMatrixData(primaryDestination, homes, destinations, activeRoutes, activeTravelModes, travelCache){
  const [syncingMatrixData, setSyncingMatrixData] = useState(false);
  const [originMetrics, setOriginMetrics] = useState({});

  useEffect(() => {
    let isCurrentRequest = true;

    if(!homes || !destinations){
      // If the map just loaded and there are no keys to process, reset to empty to not show stale data
      setOriginMetrics({});
      setSyncingMatrixData(false);
      return;
    }

    const targetRoutes = { ...activeRoutes };
    if (primaryDestination?.placeId) {
      targetRoutes[primaryDestination?.placeId] ??= '';
    }

    const updateMetrics = () =>{
      if (!isCurrentRequest) return;
      const calculated = computeMatrixMetrics(
        homes, 
        targetRoutes, 
        activeTravelModes, 
        travelCache
      );
      setOriginMetrics(calculated);
    }

    const missingRoutes = getMissingRoutes(homes, targetRoutes, activeTravelModes, travelCache);

    if(!missingRoutes){
      updateMetrics();
      setSyncingMatrixData(false);
      return;
    }

    const fetchRouteData = async () => {
      try { 
        setSyncingMatrixData(true);
        await executeFetchJobs(missingRoutes, homes, destinations, travelCache);
        
        if (isCurrentRequest) {
          updateMetrics();
          setSyncingMatrixData(false);
        }
      } catch (err) {
        console.error("Failiure in useMatrixData", err);
        if (isCurrentRequest) {
          setSyncingMatrixData(false);
        }
      }
    }

    fetchRouteData();

    return () => {
      isCurrentRequest = false;
    };
  }, [homes, activeRoutes, activeTravelModes, primaryDestination]);

  return { syncingMatrixData, originMetrics };
}