'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, House, MapPinPlus, MapPinX} from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationHomeCard.css'
import { useMapFeatures } from "../context/MapContext";
import { useEffect } from 'react';

//TODO: add weather
const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: CloudSnow,
  drizzle: CloudDrizzle,
};

const weatherColors = {
  sunny: 'home-weather-sunny',
  cloudy: 'home-weather-cloudy',
  rainy: 'home-weather-rainy',
  snowy: 'home-weather-snowy',
  drizzle: 'home-weather-drizzle',
};

/**
 * @typedef {import('../types').Row} Row
 */

/**
 * @param {{ place: Row }} props
 */
export default function LocationHomeCard({place, current = false}) {
  const { addHome, deleteFromHomeHistory, home, toggleActivePins, activePins, } = useMapFeatures();

  // for name of place TODO: using .lable tomporarily
  const [mainName, ...rest] = place.label.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activePins[place.placeId];

  return (
    <div className={`home-location-card ${current ? 'home-is-current' : ''}`}>
      <div className="home-card-inner">

        <div className="home-card-header">
          <div className="home-card-title-group">
            {current && (
              <div className="home-current-badge">CURRENT ORIGIN</div>
            )}
            <div className="home-card-title">
              <div className='home-card-main-name'>{mainName}</div>
              <div className='home-card-rest-of-address'>{restOfAddress}</div>
            </div>
            {/* <WeatherIcon className={`home-weather-icon ${weatherColors[weather]}`} /> */}
          </div>
          {/* TODO: sub with price in the future  */}
          {/* <div className="home-card-distance">
            {getImperialDist(place.distance)}
          </div> */}
        </div>

        <div className="home-card-meta">
          {place.ratings && place.ratings !== 'N/A' && (
            <StarRow rating={place.ratings} />
          )}
          {place.cost && place.cost !== 'N/A' && (
            <span className="home-price-label">{place.cost}</span>
          )}
        </div>

        {/* Transport Section (Commented out like your original file) */}
        {/* <div className="home-transport-section">
          <div className="home-transport-options">
            <div className="home-transport-option">
              <DriveEtaIcon className="home-transport-icon"/>
              <span className="home-transport-time">{formatDurationFromSeconds(place.driveTime)}</span>
              <span className="home-transport-label">Drive</span>
            </div>
            <div className="home-transport-option">
              <DirectionsWalkIcon className="home-transport-icon"/>
              <span className="home-transport-time">{formatDurationFromSeconds(place.walkTime)}</span>
              <span className="home-transport-label">Walk</span>
            </div>
            <div className="home-transport-option">
              <DirectionsTransitFilledIcon className="home-transport-icon"/>
              <span className="home-transport-time">{formatDurationFromSeconds(place.transitTime)}</span>
              <span className="home-transport-label">Transit</span>
            </div>
          </div>
        </div> */}

        <div className="home-card-actions">
          { current ? ( 
            <>
              <button 
                className="home-btn-route home-btn-unset-home" 
                onClick={() => { console.log("change to correct setter later") }}
              >
                <House className="home-btn-icon" />
                Unset Home 
              </button>

              <button className="home-btn-delete" onClick={() => { deleteFromHomeHistory(place.placeId) }}>
                <Trash2 className="home-btn-icon" />
                Delete
              </button>
            </>
          ):(
            <>
              <button 
                className="home-btn-route home-btn-set-home" 
                onClick={() => { addHome(place) }}
              >
                <House className="home-btn-icon" />
                Set Home 
              </button>
      
              <button className={`home-btn-add-pin${isActive ? ' home-btn-add-pin--active' : ''}`} 
                onClick={() => { 
                  toggleActivePins(place.placeId, place.label);
                }}
              >
                {isActive
                  ? <MapPinX className="home-btn-icon home-pins" strokeWidth={2.2}/>
                  : <MapPinPlus className="home-btn-icon home-pins"/>
                }   
              </button>
                   
              <button className="home-btn-delete" onClick={() => { deleteFromHomeHistory(place.placeId) }}>
                <Trash2 className="home-btn-icon home-delete" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const StarRow = ({ rating }) => (
  <div className="home-star-row">
    {[1, 2, 3, 4, 5].map(i => (
      <span key={i} className={`home-star ${i <= Math.round(rating) ? 'home-star--filled' : 'home-star--empty'}`}>
        ★
      </span>
    ))}
    <span className="home-rating-number">{rating.toFixed(1)}</span>
  </div>
);