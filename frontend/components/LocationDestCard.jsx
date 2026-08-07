'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, Split, X} from 'lucide-react';
import { cleanTimeRes, formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css'
import { useMapFeatures } from "../context/MapContext";
import { priceMap } from '../utils/places';

function DestFlagIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M3 2v12M3 3l9 2.5L3 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

//TODO: add weather
const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  drizzle: CloudDrizzle,
};

const weatherColors = {
  sunny: 'weather-sunny',
  cloudy: 'weather-cloudy',
  rainy: 'weather-rainy',
  snowy: 'weather-snowy',
  drizzle: 'weather-drizzle',
};

function gatherEntryData(home, place, syncingState, travelCache, activeTravelModes) {
  const entry = {
    name: place.label,
    placeId: place.placeId,
    destObj: place,
    distance: {
      drive: 0,
      walk: 0,
      transit: 0,
    },
    driveTime: 0,
    walkTime: 0,
    transitTime: 0,
    ratings: "N/A",
    cost: "N/A",
  };

  // 1. ALWAYS get Place Data (Ratings & Cost) because it does not depend on 'home'
  const placeData = travelCache.current.places[place.placeId];
  if (placeData) {
    entry.ratings = placeData.rating ?? "N/A";
    entry.cost = priceMap[placeData.priceLevel] ?? "N/A";
  }

  // 2. Early return if no home or if still syncing routes
  if (home === null || syncingState) return entry;

  // 3. Get Route Data (Distance & Time) - Only runs if 'home' exists
  const routeData = travelCache.current.routes[home.placeId]?.[place.placeId];

  if (routeData) {
    if (activeTravelModes.drive && routeData.drive?.condition === 'ROUTE_EXISTS') {
      entry.distance.drive = routeData.drive.distanceMeters;
      entry.driveTime = cleanTimeRes(routeData.drive);
    }
    if (activeTravelModes.walk && routeData.walk?.condition === 'ROUTE_EXISTS') {
      entry.distance.walk = routeData.walk.distanceMeters;
      entry.walkTime = cleanTimeRes(routeData.walk);
    }
    if (activeTravelModes.transit && routeData.transit?.condition === 'ROUTE_EXISTS') {
      entry.distance.transit = routeData.transit.distanceMeters;
      entry.transitTime = cleanTimeRes(routeData.transit);
    }
  }

  return entry;
}

/**
 * @typedef {import('../types').Row} Row
 */

/**
 * @param {{ place: Row }} props
 */

// TODO: convert to consume and creat its own row
export default function LocationDestCard({place, current = false}) {
  const { home, clearRoute, syncingMatrixData, placeDataCounter, travelCache, toggleActiveRoute, activeRoutes, 
          routeColorsPoolRef,  deleteFromDestHistory, setMainRoute, activeTravelModes} = useMapFeatures();
  
  const destData = gatherEntryData(home, place, syncingMatrixData, travelCache, activeTravelModes);

  console.log("placeDataCounter", placeDataCounter);

  // for name of place
  const [mainName, ...rest] = destData.name.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activeRoutes[destData.placeId];
  const routeColor = isActive ? activeRoutes[destData.placeId] : '';
  const highlightLimit = routeColorsPoolRef.current.length === 0;
  const showTravelData = isActive || current;

  // Finds the first mode toggled on in activeTravelModes (e.g., 'drive')
  const firstActiveMode = Object.keys(activeTravelModes).find((mode) => activeTravelModes[mode]);
  console.log("TEST", firstActiveMode);
  // Get distance in meters for that mode, defaulting to 0
  const activeDistanceMeters = destData.distance[firstActiveMode] ?? 0;
  console.log("TEST2", activeDistanceMeters);

  // EDITED: Delete should spell out "Delete" and fill the remaining row space whenever
  // Highlight Route isn't rendered next to it — true for the current-destination row
  // (which never shows Highlight Route) and for the default row once the highlight limit
  // has been reached and this route isn't the active one.
  const deleteIsFull = current || (highlightLimit && !isActive);

  /* EDITED: Replaced single Star icon with 5-star row to match v4 design's RatingBar */
  const StarRow = ({ rating }) => (
    <div className="star-row">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`star ${i <= Math.round(rating) ? 'star--filled' : 'star--empty'}`}>
          ★
        </span>
      ))}
      <span className="rating-number">{rating.toFixed(1)}</span>
    </div>
  );

  return (
    <div 
      className={`location-card ${current ? 'location-is-current' : ''}`}
      style={(!current && isActive) ? { borderLeftColor: routeColor } : {}}
    >
      <div className="card-inner">
        <div className="card-header">
          <div className="card-title-group">
            {current && (
              <div className="current-badge">PRIMARY DESTINATION</div>
            )}
            <div className={`card-title ${!showTravelData ? 'inline-title' : ''}`}>
              <div className="card-main-name">{mainName}</div>
              <div className="card-rest-of-address">{restOfAddress}</div>
            </div>
            {/* <WeatherIcon className={`weather-icon ${weatherColors[weather]}`} /> */}
          </div>
          {showTravelData && activeDistanceMeters > 0 && (
            <div className="card-distance">
              {getImperialDist(activeDistanceMeters)}
            </div>
          )}
        </div>
        <div className="card-meta">
          {destData.ratings !== 'N/A' && (
            <StarRow rating={destData.ratings} />
          )}
          {destData.cost !== 'N/A' && (
            <span className="price-label">{destData.cost}</span>
          )}
        </div>

        {/* EDITED: Transport changed from pill chips to 3-column stacked layout (icon / time / label) matching v4 */}
        {showTravelData  && (
          <div className="transport-section">
            <div className="transport-options">
              <div className="transport-option">
                <DriveEtaIcon className="transport-icon"/>
                <span className="transport-time">{formatDurationFromSeconds(destData.driveTime)}</span>
                <span className="transport-label">Drive</span>
              </div>
              <div className="transport-option">
                <DirectionsWalkIcon className="transport-icon"/>
                <span className="transport-time">{formatDurationFromSeconds(destData.walkTime)}</span>
                <span className="transport-label">Walk</span>
              </div>
              <div className="transport-option">
                <DirectionsTransitFilledIcon className="transport-icon"/>
                <span className="transport-time">{formatDurationFromSeconds(destData.transitTime)}</span>
                <span className="transport-label">Transit</span>
              </div>
            </div>
          </div>
        )}
        <div className="card-actions">
          { current ? (
            <>
              <button
                className='btn-route btn-unset-destination'
                onClick={() => {clearRoute()}}
              >
                <DestFlagIcon className='btn-icon'/>
                Remove as Primary
              </button>
              <button
                className={`btn-delete${deleteIsFull ? ' btn-delete--full' : ''}`}
                onClick={() => { deleteFromDestHistory(destData.placeId) }}
              >
                <Trash2 className="btn-icon" />
                Delete
              </button>
            </>
          ):(
            <>
              <button className="btn-route" onClick={() => { setMainRoute(destData.destObj) }}>
                <Navigation className="btn-icon" />
                Set As Primary
              </button>
              {(!highlightLimit || isActive) &&
                <button
                  className={`btn-highlight-route${isActive ? ' btn-highlight-route--active' : ''}`}
                  onClick={() => { toggleActiveRoute(destData.placeId) }}
                  style={isActive ? { 
                    backgroundColor: routeColor, 
                    borderColor: routeColor,
                    color: '#fff', // Ensures text is readable against the background
                  } : {}}
                >
                  {isActive
                    ? (
                      <>
                        <X className='btn-icon'/>
                        End Compare
                      </>
                      )
                    : (
                      <>
                        <Split className='btn-icon'/>
                        Compare
                      </>
                      )
                  }
                </button>
              }
              <button
                className={`btn-delete${deleteIsFull ? ' btn-delete--full' : ''}`}
                onClick={() => { deleteFromDestHistory(destData.placeId) }}
              >
                <Trash2 className="btn-icon" />
                {deleteIsFull && 'Delete'}
              </button>
            </>
          )}
        </div>
        

      </div>
    </div>
  );
}