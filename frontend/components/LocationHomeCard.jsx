'use client'

import { Trash2, Navigation, Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle, House, MapPinPlus, MapPinX} from 'lucide-react';
import { formatDurationFromSeconds } from '../utils/time';
import { getImperialDist } from '../utils/distance';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import DriveEtaIcon from '@mui/icons-material/DriveEta';
import DirectionsTransitFilledIcon from '@mui/icons-material/DirectionsTransitFilled';
import './LocationCard.css'
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

/*
TODO: current home shape
State(homeHistory):
{ChIJkfu1cFLkjYARXj1K2AlJSO4: {…}}

ChIJkfu1cFLkjYARXj1K2AlJSO4
:
{field: "origin", label: "Monterey, CA, USA", lat: …}
field
:
"origin"
label
:
"Monterey, CA, USA"
placeId
:
"ChIJkfu1cFLkjYARXj1K2AlJSO4"
lat
:
36.5972925
lng
:
-121.8977688
new entry
: 

*/
export default function LocationHomeCard({place}) {
  const { addHome, deleteFromHomeHistory, toggleActivePins, activePins, } = useMapFeatures();

  // for name of place TODO: using .lable tomporarily
  const [mainName, ...rest] = place.label.split(",");
  const restOfAddress = rest.join(",").trim() ;

  const isActive = !!activePins[place.placeId];

  useEffect(() => {
    console.log(activePins);
  }, [activePins]);


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
          {/* TODO: sub with price in the future  */}
          {/* <div className="card-distance">
            {getImperialDist(place.distance)}
          </div> */}
        </div>

        {/* EDITED: Meta row — rating stars + price side by side, matching v4 info-line style */}
        <div className="card-meta">
          {place.ratings && place.ratings !== 'N/A' && (
            <StarRow rating={place.ratings} />
          )}
          {place.cost && place.cost !== 'N/A' && (
            <span className="price-label">{place.cost}</span>
          )}
        </div>

        {/* EDITED: Transport changed from pill chips to 3-column stacked layout (icon / time / label) matching v4 */}
        {/* <div className="transport-section">
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
        </div> */}

        {/* EDITED: Actions redesigned — Set Route fills remaining space, Highlight Route is bordered, Delete is icon-only bordered danger (v4 style) */}
        <div className="card-actions">
          <button className="btn-route btn-set-home" onClick={() => { addHome(place) }}>
            <House className="btn-icon" />
            Set Home 
          </button>
          {/* add react function that keeps track of marked pins and renders it*/}
          <button className={`btn-add-pin${isActive ? ' btn-add-pin--active' : ''}`} 
            onClick={() => { 
            toggleActivePins(place.placeId, place.label);
          }}>
            {isActive
              ? <MapPinX strokeWidth={2.2}/>
              : <MapPinPlus/>
            }   
          </button>
          
          <button className="btn-delete" onClick={() => { deleteFromHomeHistory(place.placeId) }}>
            <Trash2 className="btn-icon" />
          </button>
        </div>

      </div>
    </div>
  );
}
