import React from 'react';
import './CardsList.css'
import { useMapFeatures } from "../context/MapContext";
import { MapPinSearch } from 'lucide-react';
import { sortActiveList } from '../utils/sortLocations';
import { ORDER_BY_MODES } from '../config/orderOptions';


/**
 * CardList Component
 * 
 * @param {Object} locationsHistory - Object keyed by placeId holding history data
 * @param {Object} activeLocations - placeIds that are members of activeRoutes or activePins
 * @param {Object|null} primary - The active current item (e.g., home or destination)
 * @param {React.Component} CardComponent - The unrendered card component to instantiate
 * @param {string} options.sortBy - The sorting criteria mode (e.g., SORT_MODES.PRICE, SORT_MODES.DISTANCE).
 * @param {number} options.orderBy - The sort direction multiplier (1 for ASC, -1 for DESC / ORDER_BY_MODES)
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
  
  // sortActiveList(activeLocationsArray, sortBy, orderBy, home?.placeId, transportMode, travelCache, originMetrics);
  sortActiveList({
    activeLocationsArray,
    sortBy,
    orderBy,
    homeId: home?.placeId,
    activeTravelMode: transportMode,
    travelCache,
    originMetrics,
  });

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
      <div className={`history-items-wrapper ${orderBy === ORDER_BY_MODES.DESC ? 'reverse' : ''}`}>
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