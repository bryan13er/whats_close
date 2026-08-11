'use client'

import { Trash2,House, MapPinPlus, MapPinX} from 'lucide-react';
import './LocationHomeCard.css'
import { useMapFeatures } from "../context/MapContext";
import { priceMap } from '../utils/places';
import StarRow from './SharedLocationCardComponents/StarRow/StarRow';
import DisplayMetrics from './SharedLocationCardComponents/DisplayMetrics/DisplayMetrics';


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
          </div>
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

