'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle } from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css'
import { useMapFeatures } from "../context/MapContext";
import { defaultColors } from '../MapStyling/RouteColors';


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

/**
 * @typedef {import('../types').Row} Row
 */

/**
 * @param {{ place: Row }} props
 */
export default function LocationCard({place}) {
  const { deleteFromHistory, setDestination, toggleActiveRoute, activeRoutes } = useMapFeatures();

  // for name of place
  const [mainName, ...rest] = place.name.split(",");
  const restOfAddress = rest.join(",").trim() 

  const routeAcitveIndex = activeRoutes.findIndex(
    r => r.placeId === place.destObj.placeId
  );
  
  const isActive = routeAcitveIndex !== -1;
  
  console.log(place)

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
    <div className="location-card">
      <div className="card-inner">

        {/* EDITED: Header now has distance pinned top-right in monospace, matching v4 layout */}
        <div className="card-header">
          <div className="card-title-group">
            <div className="card-title">
              <div className='card-main-name'>{mainName}</div>
              <div className='card-rest-of-address'>{restOfAddress}</div>
            </div>
            {/* <WeatherIcon className={`weather-icon ${weatherColors[weather]}`} /> */}
          </div>
          <div className="card-distance">
            {getImperialDist(place.distance)}
          </div>
        </div>

        {/* EDITED: Meta row — rating stars + price side by side, matching v4 info-line style */}
        <div className="card-meta">
          {place.ratings !== 'N/A' && (
            <StarRow rating={place.ratings} />
          )}
          {place.cost !== 'N/A' && (
            <span className="price-label">{place.cost}</span>
          )}
        </div>

        {/* EDITED: Transport changed from pill chips to 3-column stacked layout (icon / time / label) matching v4 */}
        <div className="transport-section">
          <div className="transport-options">
            <div className="transport-option">
              <DriveEtaIcon className="transport-icon"/>
              <span className="transport-time">{formatDurationFromSeconds(place.driveTime)}</span>
              <span className="transport-label">Drive</span>
            </div>
            <div className="transport-option">
              <DirectionsWalkIcon className="transport-icon"/>
              <span className="transport-time">{formatDurationFromSeconds(place.walkTime)}</span>
              <span className="transport-label">Walk</span>
            </div>
            <div className="transport-option">
              <DirectionsTransitFilledIcon className="transport-icon"/>
              <span className="transport-time">{formatDurationFromSeconds(place.transitTime)}</span>
              <span className="transport-label">Transit</span>
            </div>
          </div>
        </div>

        {/* EDITED: Actions redesigned — Set Route fills remaining space, Highlight Route is bordered, Delete is icon-only bordered danger (v4 style) */}
        <div className="card-actions">
          <button className="btn-route" onClick={() => { setDestination(place.destObj) }}>
            <Navigation className="btn-icon" />
            Set Route
          </button>
          {/* btn-highlight-route--active keeps the button colored while the route is on */}
          <button
            className={`btn-highlight-route${isActive ? ' btn-highlight-route--active' : ''}`}
            onClick={() => { toggleActiveRoute(place.destObj) }}
          >
            {isActive
              ? "Hide Route"
              : "Highlight Route"}
          </button>
          <button className="btn-delete" onClick={() => { deleteFromHistory(place.desPlaceId) }}>
            <Trash2 className="btn-icon" />
          </button>
        </div>

      </div>
    </div>
  );
}
