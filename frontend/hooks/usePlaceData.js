import { useState, useEffect } from 'react';
import { placesApi } from '../config/maps';

//TODO:
// Investigate why the re-render is being triggered by the state tracker in useMetrics and why I can't rely on it for showing rating and price data when there is no origin set
async function fetchMissingPlaces(missingPlaceIds, travelCacheRef) {
  if (missingPlaceIds.length === 0) return;
  
  const results = await Promise.all(
    missingPlaceIds.map(placeId => placesApi.getPlaceDetails(placeId))
  );
  
  // Write the results to the travelCache
  results.forEach((res, i) => {
    travelCacheRef.current.places[missingPlaceIds[i]] = res;
  });
}

export function usePlaceData(origins, destinations, travelCache) {
  const [placeDataCounter, setPlaceDataCoutner] = useState(0);
  const incPlaceData = () => {
    setPlaceDataCoutner((prev) => {
      return prev + 1;
    });
  }
  
  useEffect(() => {
    let isCurrentRequest = true;
    
    const fetchPlaceData = async () => {
      try {
        const locationsIdsArray = [
          ...new Set([
            ...Object.keys(destinations || {}), 
            ...Object.keys(origins || {})
          ])
        ];
        
        if (locationsIdsArray.length === 0) return;

        const missingPlaceDataIds = locationsIdsArray.filter(
          locationId => !travelCache.current.places[locationId]
        );

        if (missingPlaceDataIds.length === 0) return;

        await fetchMissingPlaces(missingPlaceDataIds, travelCache);

        if(isCurrentRequest){
          incPlaceData();
        }

      } catch (err) {
        console.error("places initialization failed:", err);
      }
    };

    fetchPlaceData();

    return () => {
      isCurrentRequest = false;
    };
  }, [origins, destinations]); 

  return placeDataCounter;
}