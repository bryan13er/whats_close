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
import { priceMap } from '../utils/places';

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

const transportLabels = {
  drive:{
    avgTime:{
      icon: AccessTimeIcon,
      label: 'avg. drive time'
    },
    avgDistance:{
      icon: DriveEtaIcon,
      label: 'avg. drive distance'
    },
  },

  walk:{
    avgTime:{
      icon: AccessTimeIcon,
      label: 'avg. walk time'
    },
    avgDistance:{
      icon: DirectionsWalkIcon,
      label: 'avg. walk distance'
    },
  },

  transit:{
    avgTime:{
      icon: AccessTimeIcon,
      label: 'avg. transit time'
    },
    avgDistance:{
      icon: DirectionsTransitFilledIcon,
      label: 'avg. transit distance'
    },
  },
}

function DisplayMetric({ 
  syncingState, 
  placeMetrics, 
  mode,       // "drive", "walk", or "transit"
  metricKey,  // "avgTime" or "avgDistance"
  formatter   // Pass the formatting function directly
}) {
  // 1. Get the icon and label config from your transportLabels map
  const config = transportLabels[mode]?.[metricKey];
  const IconComponent = config?.icon;
  const label = config?.label;

  // 2. Data check
  const modeData = placeMetrics?.[mode];
  const hasData = modeData && modeData.count > 0;

  return (
    <div className="home-transport-option">
      {/* 3. Render the retrieved Icon component */}
      {IconComponent && <IconComponent className="home-transport-icon" />}
      
      {hasData ? (
        <span className="home-transport-time">
          {formatter(modeData[metricKey])}
        </span>
      ) : syncingState ? (
        <span className="home-transport-time loading">
          <LoopIcon />
        </span>
      ) : (
        <span className="home-transport-time">-</span>
      )}
      
      <span className="home-transport-label">{label}</span>
    </div>
  );
}

function DisplayMetrics({syncingMatrixData, placeMetrics, transportMode}) { 
  return (
    <div className="home-transport-section">
      <div className="home-transport-options">
        {/* 1. DRIVE TIME */}
        <DisplayMetric 
          syncingState={syncingMatrixData}
          placeMetrics={placeMetrics}
          mode={transportMode}
          metricKey="avgTime"
          formatter={formatDurationFromSeconds}
        />

        {/* 2. DRIVE DISTANCE */}
        <DisplayMetric 
          syncingState={syncingMatrixData}
          placeMetrics={placeMetrics}
          mode={transportMode}
          metricKey="avgDistance"
          formatter={getImperialDist}
        />
      </div>
    </div>
  )
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

function gatherEntryData(place, travelCache, originMetrics) {
  const entry = {
    name: place.label,
    placeId: place.placeId,
    destObj: place,
    ratings: "N/A",
    cost: "N/A",
    metrics: undefined,
  };

  // 1. ALWAYS get Place Data (Ratings & Cost) because it does not depend on 'home'
  const placeData = travelCache.current.places[place.placeId];
  if (placeData) {
    entry.ratings = placeData.rating ?? "N/A";
    entry.cost = priceMap[placeData.priceLevel] ?? "N/A";
  }

  // 2. intalize metrics
  entry.metrics = originMetrics?.[place.placeId];
  return entry;
}




/**
 * @typedef {import('../types').Row} Row
 */

/**
 * @param {{ place: Row }} props
 */
export default function LocationHomeCard({place, current = false}) {
  const { addHome, handleHomeClear, deleteFromHomeHistory, toggleActivePins, activePins, syncingMatrixData, originMetrics, activeTravelModes, travelCache } = useMapFeatures();
  const homeData = gatherEntryData(place, travelCache, originMetrics);

  // for name of place TODO: using .lable tomporarily
  const [mainName, ...rest] = homeData.name.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activePins[place.placeId];

  // TODO: rn will get first travel mode thats turned on only
  const transportMode = Object.keys(activeTravelModes).find(
    (mode) => activeTravelModes[mode] === true
  );

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
          {homeData.ratings !== 'N/A' && (
            <StarRow rating={homeData.ratings} />
          )}
          {homeData.cost !== 'N/A' && (
            <span className="home-price-label">{homeData.cost}</span>
          )}
        </div>

        <DisplayMetrics
          syncingMatrixData={syncingMatrixData}
          placeMetrics={homeData.metrics}
          transportMode={transportMode}
        />

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

