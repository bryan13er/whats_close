import React from 'react';
import './CardsList.css'
import { useMapFeatures } from "../context/MapContext";

/**
 * Sorts the active routes array in place.
 * 
 * @param {Array} activeLocationsArray - The array of placeIds to sort
 * @param {string} sortBy - The sort criteria ('none', 'distance', 'price')
 * @param {string} homeId - The placeId of the current home
 * @param {Object} travelCache - The ref containing route and place data
 */
function sortActiveList(activeLocationsArray, sortBy, homeId, travelCache) {
  console.log("before", activeLocationsArray);
  console.log("sortBy", sortBy);
  // 1. Immediately reverse the array so the default order is "Newest on Top"
  activeLocationsArray.reverse();

  // 2. Apply sorting rules ONLY if a sort is active
  if (sortBy !== 'none' && activeLocationsArray.length > 0) {
    activeLocationsArray.sort((placeA, placeB) => {
      
      // SORT BY DISTANCE
      if (sortBy === 'distance') {
        console.log("happens");
        const distA = travelCache.current.routes[homeId]?.[placeA]?.drive?.distanceMeters ?? Infinity;
        const distB = travelCache.current.routes[homeId]?.[placeB]?.drive?.distanceMeters ?? Infinity;
        
        return distB - distA; 
      }

      // SORT BY PRICE
      if (sortBy === 'price') {
        const priceA = travelCache.current.places[placeA]?.priceLevel ?? Infinity;
        const priceB = travelCache.current.places[placeB]?.priceLevel ?? Infinity;
        
        return priceB - priceA;
      }

      return 0;
    });

    console.log("after", activeLocationsArray);
  }
}

/**
 * CardList Component
 * 
 * @param {Object} locationsHistory - Object keyed by placeId holding history data[cite: 1, 2]
 * @param {Object} activeLocations - placeIds that are members of activeRoutes or activePins
 * @param {Object|null} primary - The active current item (e.g., home or destination)[cite: 1, 2]
 * @param {React.Component} CardComponent - The unrendered card component to instantiate
 */
export default function CardList({ locationsHistory = {}, activeLocations = {}, primary = null, CardComponent, sortBy = 'none'}) {
  const { travelCache, home } = useMapFeatures();

  const activeLocationsArray = Object.keys(activeLocations); // Changed to Object.keys to extract the IDs
  const locationsArray = Object.values(locationsHistory); // Convert history object to iterable array
  sortActiveList(activeLocationsArray, sortBy, home?.placeId, travelCache);



  return (
    <div className="card-list-container">
      {/* 1. Render the active "Current" card at the absolute top if it exists[cite: 2] */}
      {primary?.placeId && (
        <CardComponent key={primary.placeId} place={primary} current={true}/>
      )}

      {/* 2. Render activeLocations if not empty */}
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

      {/* 3. Render the historical list container which flips visually via CSS[cite: 2] */}
      <div className="history-items-wrapper">
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