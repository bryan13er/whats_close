import { useEffect, useMemo, useState } from 'react';
import { createDataLookup, } from '../utils/places';
import { routesMatrixApi, } from '../config/maps';

// upon review I find that given the maximum size of homeHistoyr and activeRoutes
// its okay for the crossProductKeys to be recreated otherwise I would have to 
// do some garabage collection or figure out how to create only the newest pairs
function createCrossProduct(homeHistory, activeRoutes, destinationId){
  const homeIds = Object.keys(homeHistory);

  // Use a Set to automatically deduplicate activeRoutes + destinationId
  const destSet = new Set(Object.keys(activeRoutes));
  if (destinationId) destSet.add(destinationId);
  
  const destIds = Array.from(destSet);

  if (!homeIds.length || !destIds.length) return [];

  const crossProductKeysArray = homeIds.flatMap(homeId =>
    destIds
      .filter(destId => destId !== homeId)
      .map(destId => `${homeId}::${destId}`)
  );

  return crossProductKeysArray;
}

function gatherMissingRoutes(crossProductKeysArray)


// function createFetchJobs(crossProductKeysArray){
  

// }

export function useOriginMetricsV2(destinationId, homeHistory, destHistory, activeRoutes, travelCache, activeTravelModes) {
  const [syncingMetrics, setSyncingMetrics] = useState(false);
  // keyed by orign id
  const [originMetrics, setOriginMetrics] = useState({}); 

  // TODO: I have done this in order to align the travel mode to whatever is globally set
  // for a premium feature set I will support averages but only for one transport at a time that has to be selected from whatever is active
  // or better yet from premium it will be all or nothing for normal its not
  const firstActiveMode = Object.keys(activeTravelModes).find(
    (mode) => activeTravelModes[mode] === true
  );





}