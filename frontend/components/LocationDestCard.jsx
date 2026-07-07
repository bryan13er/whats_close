'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle } from 'lucide-react';
import { cleanTimeRes, formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css'
import { useMapFeatures } from "../context/MapContext";
import { priceMap } from '../utils/places';
import FlagIcon from '@mui/icons-material/Flag';

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

function gatherEntryData(home, place, syncingDestData, travelCache) {
  const entry = {
    name: place.label,
    placeId: place.placeId,
    destObj: place,
    distance: 0,
    driveTime: 0,
    walkTime: 0,
    transitTime: 0,
    ratings: "N/A",
    cost: "N/A",
  };

  if (home === null || syncingDestData) return entry;

  const routeData = travelCache.current.routes[home.placeId]?.[place.placeId];
  const placeData = travelCache.current.places[place.placeId];

  // TODO convert to a loop when ready
  if (routeData) {
    if (routeData.drive?.condition === 'ROUTE_EXISTS') {
      entry.distance = routeData.drive.distanceMeters;
      entry.driveTime = cleanTimeRes(routeData.drive);
    }
    if (routeData.walk?.condition === 'ROUTE_EXISTS') {
      entry.walkTime = cleanTimeRes(routeData.walk);
    }
    if (routeData.transit?.condition === 'ROUTE_EXISTS') {
      entry.transitTime = cleanTimeRes(routeData.transit);
    }
  }

  if (placeData) {
    entry.ratings = placeData.rating ?? "N/A";
    entry.cost = priceMap[placeData.priceLevel] ?? "N/A";
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
  const { home, clearRoute, syncingDestData, travelCache, setDestination, toggleActiveRoute, activeRoutes, routeColorsPoolRef,  deleteFromDestHistory } = useMapFeatures();
  const destData = gatherEntryData(home, place, syncingDestData, travelCache);

  // for name of place
  const [mainName, ...rest] = destData.name.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activeRoutes[destData.placeId];
  const routeColor = isActive ? activeRoutes[destData.placeId] : '';
  const highlightLimit = routeColorsPoolRef.current.length === 0;

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
    /* EDITED: Removed card shadow/bg — now a flat row with bottom border divider (v4 PlaceRow style) */
    <div className={`location-card ${current ? 'location-is-current' : ''}`}>
      <div className="card-inner">

        {/* EDITED: Header now has distance pinned top-right in monospace, matching v4 layout */}
        <div className="card-header">
          <div className="card-title-group">
            {current && (
              <div className="current-badge">CURRENT DESTINATION</div>
            )}
            <div className="card-title">
              <div className='card-main-name'>{mainName}</div>
              <div className='card-rest-of-address'>{restOfAddress}</div>
            </div>
            {/* <WeatherIcon className={`weather-icon ${weatherColors[weather]}`} /> */}
          </div>
          <div className="card-distance">
            {getImperialDist(destData.distance)}
          </div>
        </div>

        {/* EDITED: Meta row — rating stars + price side by side, matching v4 info-line style */}
        <div className="card-meta">
          {destData.ratings !== 'N/A' && (
            <StarRow rating={destData.ratings} />
          )}
          {destData.cost !== 'N/A' && (
            <span className="price-label">{destData.cost}</span>
          )}
        </div>

        {/* EDITED: Transport changed from pill chips to 3-column stacked layout (icon / time / label) matching v4 */}
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

        {/* EDITED: Actions redesigned — Set Route fills remaining space, Highlight Route is bordered, Delete is icon-only bordered danger (v4 style) */}
        <div className="card-actions">
          { current ? (
            <>
              <button
                className='btn-route btn-unset-destination'
                onClick={() => {clearRoute()}}
              >
                <FlagIcon className='btn-icon'/>
                Unset Destination
              </button>
              {(!highlightLimit || isActive) &&
                <button
                  className={`btn-highlight-route${isActive ? ' btn-highlight-route--active' : ''}`}
                  onClick={() => { toggleActiveRoute(destData.placeId) }}
                  style={isActive ? { 
                    backgroundColor: routeColor, 
                    borderColor: routeColor,
                    color: '#fff' // Ensures text is readable against the background
                  } : {}}
                >
                  {isActive
                    ? "Hide Route"
                    : "Highlight Route"}
                </button>
              }
              <button className="btn-delete" onClick={() => { deleteFromDestHistory(destData.placeId) }}>
                <Trash2 className="btn-icon" />
              </button>
            </>
          ):(
            <>
              <button className="btn-route" onClick={() => { setDestination(destData.destObj) }}>
                <Navigation className="btn-icon" />
                Set Route
              </button>
              {(!highlightLimit || isActive) &&
                <button
                  className={`btn-highlight-route${isActive ? ' btn-highlight-route--active' : ''}`}
                  onClick={() => { toggleActiveRoute(destData.placeId) }}
                  style={isActive ? { 
                    backgroundColor: routeColor, 
                    borderColor: routeColor,
                    color: '#fff' // Ensures text is readable against the background
                  } : {}}
                >
                  {isActive
                    ? "Hide Route"
                    : "Highlight Route"}
                </button>
              }
              <button className="btn-delete" onClick={() => { deleteFromDestHistory(destData.placeId) }}>
                <Trash2 className="btn-icon" />
              </button>
            </>
          )}
        </div>
        

      </div>
    </div>
  );
}
