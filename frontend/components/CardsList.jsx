import React from 'react';
import './CardsList.css'
import { useMapFeatures } from "../context/MapContext";
import { MapPinSearch } from 'lucide-react';
import { PRICE_LEVEL_WEIGHTS } from '../config/priceLevelWeights';
import { cleanTimeString } from '../utils/time';


function getValidRouteMode({ homeId, destId, travelCache, activeTravelMode }) {
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
function compare(valA, valB, dir){
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
function sortActiveList(activeLocationsArray, sortBy, orderBy, homeId, activeTravelMode, travelCache, originMetrics) {


  const ASC = 1;
  const DESC = -1;
  
  const places = travelCache.current.places;
  const dir = orderBy ? DESC : ASC;

  // apply order by if valid
  if (orderBy) activeLocationsArray.reverse();

  // TODO: after fixing one transport mode add the distance and eta sort by
  // 2. Apply sorting rules ONLY if a sort is active
  if (sortBy !== 'none' && activeLocationsArray.length > 0) {
    activeLocationsArray.sort((placeA, placeB) => {
            
      // --- SORT BY PRICE (Expensive -> Inexpensive; Missing at Bottom) ---
      if (sortBy === 'price') {
        const rawPriceA = places[placeA]?.priceLevel;
        const rawPriceB = places[placeB]?.priceLevel;

        // Convert enums to numbers. Fallback to -1 so unknown prices fall to the bottom in descending sort
        const priceA = PRICE_LEVEL_WEIGHTS[rawPriceA] ?? -1;
        const priceB = PRICE_LEVEL_WEIGHTS[rawPriceB] ?? -1;

        return compare(priceA, priceB, dir)
      }


      // SORT BY RATING
      if (sortBy === 'rating') {
        const ratingA = places[placeA]?.rating ?? -1;
        const ratingB = places[placeB]?.rating ?? -1;
        
        return compare(ratingA, ratingB, dir)
      }

      if (sortBy === 'distance') {
        const routeA = getValidRouteMode({ homeId, destId: placeA, travelCache, activeTravelMode });
        const routeB = getValidRouteMode({ homeId, destId: placeB, travelCache, activeTravelMode });
        
        const distA = routeA?.distanceMeters ?? -1;
        const distB = routeB?.distanceMeters ?? -1;

        return compare(distA, distB, dir);
      }

      if (sortBy === 'eta') {
        const routeA = getValidRouteMode({ homeId, destId: placeA, travelCache, activeTravelMode });
        const routeB = getValidRouteMode({ homeId, destId: placeB, travelCache, activeTravelMode });

        // Apply your cleaning function here
        const etaA = routeA ? cleanTimeString(routeA.duration) : -1;
        const etaB = routeB ? cleanTimeString(routeB.duration) : -1;


        return compare(etaA, etaB, dir);
      }

      if (sortBy === 'avgTime') {
        const metricsA = originMetrics?.[placeA]?.[activeTravelMode];
        const metricsB = originMetrics?.[placeB]?.[activeTravelMode];

        const avgTimeA = metricsA?.avgTime ?? -1;
        const avgTimeB = metricsB?.avgTime ?? -1;

        return compare(avgTimeA, avgTimeB, dir);
      }

      if (sortBy == 'avgDistance') {
        const metricsA = originMetrics?.[placeA]?.[activeTravelMode];
        const metricsB = originMetrics?.[placeB]?.[activeTravelMode];

        const avgDistanceA = metricsA?.avgDistance ?? -1;
        const avgDistanceB = metricsB?.avgDistance ?? -1;

        return compare(avgDistanceA, avgDistanceB, dir);
      }

      return 0;
    });

  }
}



/**
 * CardList Component
 * 
 * @param {Object} locationsHistory - Object keyed by placeId holding history data
 * @param {Object} activeLocations - placeIds that are members of activeRoutes or activePins
 * @param {Object|null} primary - The active current item (e.g., home or destination)
 * @param {React.Component} CardComponent - The unrendered card component to instantiate
 */
export default function CardList({ locationsHistory = {}, activeLocations = {}, primary = null, CardComponent, sortBy, orderBy}) {
  const { travelCache, home, activeTravelModes, originMetrics } = useMapFeatures();

  // TODO: rn will get first travel mode thats turned on only
  const transportMode = Object.keys(activeTravelModes).find(
    (mode) => activeTravelModes[mode] === true
  );

  const activeLocationsArray = Object.keys(activeLocations); // Changed to Object.keys to extract the IDs
  const locationsArray = Object.values(locationsHistory); // Convert history object to iterable array
  
  // Inside CardList component...
  if (!primary?.placeId && activeLocationsArray.length === 0 && locationsArray.length === 0) {
    return (
      <div className="empty-history-state">
        <MapPinSearch className="empty-icon" />
        <p className="empty-title">No saved locations</p>
        <span className="empty-subtitle">Add a location on the map to see it listed here.</span>
      </div>
    );
  }
  
  sortActiveList(activeLocationsArray, sortBy, orderBy, home?.placeId, transportMode, travelCache, originMetrics);

  return (
    <div className="card-list-container">
      {/* 1. Render the active "Current" card at the absolute top if it exists[cite: 2] */}
      {primary?.placeId && (
        <CardComponent 
          key={primary.placeId} 
          place={primary} 
          current={true} 
        />
      )}

      {/* 
        2. Render activeLocations if not empty 
        REMINDER the sort by function takes care of 
      */}
      {activeLocationsArray.length > 0 && (
        <div className='active-routes-wrapper'>
          {activeLocationsArray.map((activeLocationId) => {
            if (!Object.hasOwn(locationsHistory, activeLocationId)) {
              console.error(
                `[CardList Error]: Active Location ID "${activeLocationId}" does not exist in the locations history object.`,
              );
              return null; // Don't break the UI; just skip rendering this card
            }
            
            // If it exists, grab the location item and render it
            const locationItem = locationsHistory[activeLocationId];
            return <CardComponent key={activeLocationId} place={locationItem} />;
          })}
        </div>
      )}

      {/* 3. Render the historical list container which flips according to order by */}
      <div className={`history-items-wrapper ${orderBy ? 'reverse' : ''}`}>
        {locationsArray.map((location) => {
          // FIXES: Using 'location' instead of 'item', checking 'primary?.placeId' instead of missing 'excludeId'
          if (
            (primary?.placeId && location.placeId === primary.placeId) || 
            Object.hasOwn(activeLocations, location.placeId)
          ) {
            return null;
          }
          
          // Instantiate the passed component reference dynamically[cite: 2]
          return <CardComponent key={location.placeId} place={location} />;
        })}
      </div>
    </div>
  );
}