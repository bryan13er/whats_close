
import { PRICE_LEVEL_WEIGHTS } from "../config/priceLevelWeights";
import { cleanTimeString } from "./time";
import { SORT_MODES } from "../config/sortOptions";
import { ORDER_BY_MODES } from "../config/orderOptions";

export function getValidRouteMode({ homeId, destId, travelCache, activeTravelMode }) {
  const routeData = travelCache.current.routes[homeId]?.[destId];

  // Optional chaining makes this very clean
  if (routeData?.[activeTravelMode]?.condition === 'ROUTE_EXISTS') {
    return routeData[activeTravelMode];
  }

  return undefined;
}

/**
 * Compares two numerical values for array sorting, applying a direction multiplier 
 * and ensuring missing or invalid values (-1) are always pushed to the end.
 * 
 * @param {number} valA - The first numerical value to compare
 * @param {number} valB - The second numerical value to compare
 * @param {number} dir - The direction multiplier (1 for ASC, -1 for DESC)
 * @returns {number} A negative, positive, or zero value to determine sort order
 */
export function compare(valA, valB, dir){
  if (valA === -1 && valB === -1) return 0;
  if (valA === -1) return 1;
  if (valB === -1) return -1;

  // Apply direction only to valid numerical comparisons
  return (valA - valB) * dir;
}

/**
 * Sorts the active routes array in place.
 * defualt sort is sort newest to oldest
 * the sort 
 * 
 * @param {Array} activeLocationsArray - The array of placeIds to sort
 * @param {string} sortBy - The sort criteria ('none', 'distance', 'price')
 * @param {bool}   orderBy - true = DESC, false = ASC if no value goes to bottom
 * @param {string} homeId - The placeId of the current home
 * @param {Object} travelCache - The ref containing route and place data
 */
export function sortActiveList({activeLocationsArray, sortBy, orderBy, homeId, activeTravelMode, travelCache, originMetrics}) {
  
  const places = travelCache.current.places;

  // apply desc order on all items if valid this works because its based on insert order of the object
  if (orderBy === ORDER_BY_MODES.DESC) activeLocationsArray.reverse();

  // TODO: after fixing one transport mode add the distance and eta sort by
  // 2. Apply sorting rules ONLY if a sort is active
  if (sortBy !== 'none' && activeLocationsArray.length > 0) {
    activeLocationsArray.sort((placeA, placeB) => {
            
      // --- SORT BY PRICE (Expensive -> Inexpensive; Missing at Bottom) ---
      if (sortBy === SORT_MODES.PRICE) {
        const rawPriceA = places[placeA]?.priceLevel;
        const rawPriceB = places[placeB]?.priceLevel;

        // Convert enums to numbers. Fallback to -1 so unknown prices fall to the bottom in descending sort
        const priceA = PRICE_LEVEL_WEIGHTS[rawPriceA] ?? -1;
        const priceB = PRICE_LEVEL_WEIGHTS[rawPriceB] ?? -1;

        return compare(priceA, priceB, orderBy)
      }


      // SORT BY RATING
      if (sortBy === SORT_MODES.RATING) {
        const ratingA = places[placeA]?.rating ?? -1;
        const ratingB = places[placeB]?.rating ?? -1;
        
        return compare(ratingA, ratingB, orderBy)
      }

      if (sortBy === SORT_MODES.DISTANCE) {
        const routeA = getValidRouteMode({ homeId, destId: placeA, travelCache, activeTravelMode });
        const routeB = getValidRouteMode({ homeId, destId: placeB, travelCache, activeTravelMode });
        
        const distA = routeA?.distanceMeters ?? -1;
        const distB = routeB?.distanceMeters ?? -1;

        return compare(distA, distB, orderBy);
      }

      if (sortBy === SORT_MODES.ETA) {
        const routeA = getValidRouteMode({ homeId, destId: placeA, travelCache, activeTravelMode });
        const routeB = getValidRouteMode({ homeId, destId: placeB, travelCache, activeTravelMode });

        // Apply your cleaning function here
        const etaA = routeA ? cleanTimeString(routeA.duration) : -1;
        const etaB = routeB ? cleanTimeString(routeB.duration) : -1;


        return compare(etaA, etaB, orderBy);
      }

      if (sortBy === SORT_MODES.AVG_TIME) {
        const metricsA = originMetrics?.[placeA]?.[activeTravelMode];
        const metricsB = originMetrics?.[placeB]?.[activeTravelMode];

        const avgTimeA = metricsA?.avgTime ?? -1;
        const avgTimeB = metricsB?.avgTime ?? -1;

        return compare(avgTimeA, avgTimeB, orderBy);
      }

      if (sortBy == SORT_MODES.AVG_DISTANCE) {
        const metricsA = originMetrics?.[placeA]?.[activeTravelMode];
        const metricsB = originMetrics?.[placeB]?.[activeTravelMode];

        const avgDistanceA = metricsA?.avgDistance ?? -1;
        const avgDistanceB = metricsB?.avgDistance ?? -1;

        return compare(avgDistanceA, avgDistanceB, orderBy);
      }

      return 0;
    });

  }
}