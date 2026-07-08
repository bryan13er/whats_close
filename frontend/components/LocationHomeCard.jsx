'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, House, MapPinPlus, MapPinX} from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LoopIcon from '@mui/icons-material/Loop';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationHomeCard.css'
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
  sunny: 'home-weather-sunny',
  cloudy: 'home-weather-cloudy',
  rainy: 'home-weather-rainy',
  snowy: 'home-weather-snowy',
  drizzle: 'home-weather-drizzle',
};

function DisplayMetric({ 
  syncingMetrics, 
  placeMetrics, 
  mode,       // "drive", "walk", or "transit"
  metricKey,  // "avgTime" or "avgDistance"
  label,      // "avg. Drive", "avg. Drive Distance", etc.
  Icon,       // Pass the Icon component directly (e.g., DriveEtaIcon)
  formatter   // Pass the formatting function directly (e.g., formatDurationFromSeconds)
}) {
  
  // Clean, defensive guard check inside the component
  const modeData = placeMetrics?.[mode];
  const hasData = modeData && modeData.count > 0;

  return (
    <div className="home-transport-option">
      {/* Render the dynamic icon passed down as a component property */}
      <Icon className="home-transport-icon" />
      
      {hasData ? (
        <span className="home-transport-time">
          {/* Dynamically invoke the correct formatter function passed in */}
          {formatter(modeData[metricKey])}
        </span>
      ) : syncingMetrics ? (
        <span className="home-transport-time loading">
          <LoopIcon/>
        </span>
      ) : (
        <span className="home-transport-time">-</span>
      )}
      
      <span className="home-transport-label">{label}</span>
    </div>
  );
}

/**
 * @typedef {import('../types').Row} Row
 */

/**
 * @param {{ place: Row }} props
 */
export default function LocationHomeCard({place, current = false}) {
  const { addHome, handleHomeClear, deleteFromHomeHistory, toggleActivePins, activePins, syncingMetrics, originMetrics } = useMapFeatures();

  // for name of place TODO: using .lable tomporarily
  const [mainName, ...rest] = place.label.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activePins[place.placeId];

  // get metrics on the particalar placeid 
  const placeMetrics = originMetrics?.[place.placeId];

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

        <div className="home-transport-section">
          <div className="home-transport-options">
            {/* 1. DRIVE TIME */}
            <DisplayMetric 
              syncingMetrics={syncingMetrics}
              placeMetrics={placeMetrics}
              mode="drive"
              metricKey="avgTime"
              label=" avg. Drive Time"
              Icon={AccessTimeIcon}
              formatter={formatDurationFromSeconds}
            />

            {/* 2. DRIVE DISTANCE */}
            <DisplayMetric 
              syncingMetrics={syncingMetrics}
              placeMetrics={placeMetrics}
              mode="drive"
              metricKey="avgDistance"
              label="avg. Drive Distance"
              Icon={DriveEtaIcon } // Swap to a ruler or landscape icon if you want to distinguish it from walking rows
              formatter={getImperialDist}
            />

            {/* 3. TRANSIT TIME */}
            {/* <DisplayMetric 
              syncingMetrics={syncingMetrics}
              placeMetrics={placeMetrics}
              mode="transit"
              metricKey="avgTime"
              label="avg. Transit"
              Icon={DirectionsTransitFilledIcon}
              formatter={formatDurationFromSeconds}
            /> */}
          </div>
        </div>

        <div className="home-card-actions">
          { current ? ( 
            <>
              <button 
                className="home-btn-route home-btn-unset-home" 
                onClick={() => { handleHomeClear() }}
              >
                <House className="home-btn-icon" />
                Unset Origin
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
                Set Origin 
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