'use client'

import { Trash2, Navigation, Star, DollarSign, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, Map, MapOff } from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css'
import { useMapFeatures } from "../context/MapContext";


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
 * @typedef {Object} place
 * @property {string} name - "Chipotle Mexican Grill, Munras Avenue, Monterey, CA, USA"
 * @property {string} desPlaceId - "ChIJl28xQCTkjYAR48CoQtJ6pb4"
 * @property {object} destObj
 * @property {string} destObj.field - "dest"
 * @property {string} destObj.label - "Chipotle Mexican Grill, Munras Avenue, Monterey, CA, USA"
 * @property {string} destObj.placeId - "ChIJl28xQCTkjYAR48CoQtJ6pb4"
 * @property {number} destObj.lat - 36.5969267
 * @property {number} destObj.lng - -121.8944817
 * @property {number} distance - 30353 (meters)
 * @property {number} driveTime - 1595 (seconds)
 * @property {number} transitTime - 3471 (seconds)
 * @property {number} walkTime - 23688 (seconds)
 * @property {number} ratings - 3.8 or 'N/A'
 * @property {string} cost - "$" or 'N/A'
 */

/**
 * @param {{ place: place }} props
 */
export default function LocationCard({place}) {
  const { deleteFromHistory, setDestination, toggleActiveRoute, activeRoutes } = useMapFeatures();
  // true when this card's route is currently being displayed on the map
  const isRouteActive = activeRoutes.some(r => r.placeId === place.destObj.placeId);
  console.log(place)

  return (
    <div className="location-card">
      <div className="card-header">
        <h2 className="card-title">{place.name}</h2>
        {/* <WeatherIcon className={`weather-icon ${weatherColors[weather]}`} /> */}
      </div>

      <div className="card-meta">
        {place.ratings !== 'N/A' && (
          <div className="rating">
            <Star className="star-icon" />
            <span>{place.ratings.toFixed(1)}</span>
          </div>
        )}
        {place.cost !== 'N/A' && (
          <div className="price">
            {[...Array(place.cost.length)].map((_, i) => (
              <DollarSign key={i} className="dollar active" />
            ))}
            {[...Array(4 - place.cost.length)].map((_, i) => (
              <DollarSign key={i + place.cost.length} className="dollar inactive" />
            ))}
          </div>
        )}
        {/*TODO: think about where distance should go will leave it here for now maybe make it a button to see km like the other */}
        <div>
          {getImperialDist(place.distance)}
        </div>
      </div>

      <div className="transport-section">
        <div className="transport-options">
          <div className="transport-option">
            <DriveEtaIcon className="transport-icon"/>
            <span>{formatDurationFromSeconds(place.driveTime)}</span>
          </div>
          <div className="transport-option">
            <DirectionsWalkIcon className="transport-icon"/>
            <span>{formatDurationFromSeconds(place.walkTime)}</span>
          </div>
          <div className="transport-option">
            <DirectionsTransitFilledIcon className="transport-icon"/>
            <span>{formatDurationFromSeconds(place.transitTime)}</span>
          </div>
        </div>
      </div>

      {/* TODO: set up button handlers */}
      <div className="card-actions">
        <button className="btn-route" onClick={() => {setDestination(place.destObj)}}>
          <Navigation className="btn-icon" />
          Set Route
        </button>
        <button
          className={`btn-show-route${isRouteActive ? ' btn-show-route--active' : ''}`}
          onClick={() => { toggleActiveRoute(place.destObj); }}
        >
          {isRouteActive
            ? <><Map className="btn-icon" /> Route On</>
            : <><MapOff className="btn-icon" /> Show Route</>
          }
        </button>
        <button className="btn-delete" onClick={() => {deleteFromHistory(place.desPlaceId)}}>
          <Trash2 className="btn-icon" />
          Delete
        </button>
      </div>
    </div>
  );
}
