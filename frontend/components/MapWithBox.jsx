"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  Map as GoogleMap,
  MapControl,
  useMap,
} from "@vis.gl/react-google-maps";
import {RoutesApi} from '../routes-api';
import "./MapWithBox.css";
import Autocomplete from "./Autocomplete";
import Route from './route'
import DestInfoTable from "./DestInfoTable";
import HomeIcon from '@mui/icons-material/Home';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import NavigationIcon from '@mui/icons-material/Navigation';
import TrafficIcon from '@mui/icons-material/Traffic';
import PublicIcon from '@mui/icons-material/Public';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_ZOOM =  12;
const MAP_STYLE = { width: "100%", height: "100%" };
const LIBRARIES = ["places"];

const apiClient = new RoutesApi(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);

const routeOptions = {
  travelMode: 'DRIVE',
  // RoutingPreference: 'TRAFFIC_AWARE'
}

function MapCenterControl({centerTarget}){  
  const map = useMap();

  useEffect(() => {
    if(map && centerTarget){
      map.setCenter(centerTarget);
      map.setZoom(DEFAULT_ZOOM);
    }
  }, [map, centerTarget]);

  return null;
}

function StreetViewWatcher({ onVisibilityChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const streetView = map.getStreetView();
    const syncVisibility = () => {
      onVisibilityChange(Boolean(streetView.getVisible()));
    };

    syncVisibility();
    const listener = streetView.addListener("visible_changed", syncVisibility);

    return () => {
      listener.remove();
    };
  }, [map, onVisibilityChange]);

  return null;
}

function RecenterRouteButton({ routeBounds, home, isStreetViewVisible }) {
  const map = useMap();

  if (!map) return null;
  if (isStreetViewVisible) return null;
  if (!routeBounds && !home) return null;

  const handleRecenter = () => {
    if (routeBounds) {
      map.fitBounds(routeBounds);
      return;
    }

    if (home) {
      map.panTo(home);
      map.setZoom(DEFAULT_ZOOM);
    }
  };

  return (
    <MapControl position={ControlPosition.INLINE_END_BLOCK_END}>
      <button
        type="button"
        className="map-control-button recenter-mapcontrol-button"
        aria-label="Recenter map"
        onClick={handleRecenter}
      >
        <MyLocationIcon className="nav-icons" />
      </button>
    </MapControl>
  );
}

//TODO: there is a big problem the component rerenders everytime i move the map
// so its leading to a crash becasue its running out o memory consult the
// docs and see how to properly set center
export default function MapWithBox({ center }) {
  console.log("🛠️ MapWithBox Rendered"); // Add this
  const initialPosition = center || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialPosition);
  const [home, setHome]               = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null); // needed for recenter button
  const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
  const [mapType, setMapType] = useState(true);
  const [destHistory, setDestHistory] = useState([]);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  const seenDests = new Set();

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setMapCenter(userPosition);
    });
  }, []);

  if (!apiKey) return <StatusOverlay message="Missing API key in frontend/.env" />;
  if (!mapId) return <StatusOverlay message="Missing map ID in frontend/.env" />;

  const handleHomeSelect = (location) => {
    console.log(location);
    setMapCenter({ lat: location.lat, lng: location.lng });
    setHome(location);
  };

  const handleDestinationSelect = (location) => {
    setDestination(location);

    // TODO: settled on this check beause the node will run out of memory
    setDestHistory((prev) => {
      // Check if we already have this destination in our history
      const isDuplicate = prev.some((d) => d.placeId === location.placeId);
      if (isDuplicate) {
        return prev; // Return existing state, triggering NO re-render
      }
      // Add the new location to the array
      return [...prev, location];
    });

    console.log("searchhistory", destHistory);
  };


  const handleHomeClear = () => {
    setHome(null);
    setDestination(null);
    setRouteBounds(null);
  }

  const handleDestinationClear = () => {
    setDestination(null);
    setRouteBounds(null);

    if (home) {
      setMapCenter({ lat: home.lat, lng: home.lng });
    }
  }

  const handleMapType = () => {
    setMapType(mapType => !mapType);
  }

  return (
    <APIProvider apiKey={apiKey} libraries={LIBRARIES}>
      <div className="map-container">
        {!isStreetViewVisible && !home ? (
          <div className="search-overlay search-overlay--top">
            <Autocomplete onPlaceSelect={handleHomeSelect} placeholder="Where from..." />
          </div>
        ) : !isStreetViewVisible && home ? (
          <button type="button" onClick={handleHomeClear} className="nav-buttons home-button" aria-label="Go home">
            <HomeIcon className="nav-icons" />
          </button>
        ) : null}
        {!isStreetViewVisible && home && (
          !destination ? (
            <div className="search-overlay search-overlay--top">
              <Autocomplete onPlaceSelect={handleDestinationSelect} />
            </div>
          ) : (
            <button type="button" onClick={handleDestinationClear} className="nav-buttons dest-button" aria-label="Change destination">
              <NavigationIcon className="nav-icons" />
            </button>
          )
        )}

        <GoogleMap
          style={MAP_STYLE}
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapId={mapId}
          mapTypeId={mapType ? 'roadmap' : 'hybrid'}
          streetViewControl
          cameraControl={false}
          mapTypeControl={false}
          fullscreenControl
          
  
        >
          <MapCenterControl centerTarget={mapCenter} />
          <StreetViewWatcher onVisibilityChange={setIsStreetViewVisible} />

          {home && destination &&
            <Route
              apiClient={apiClient}
              origin={home}
              destination={destination}
              routeOptions={routeOptions}
              showInfoPill={!isStreetViewVisible}
              onRouteBoundsChange={setRouteBounds}
            />
          }

          <RecenterRouteButton
            home={home}
            routeBounds={routeBounds}
            isStreetViewVisible={isStreetViewVisible}
          />

          <MapControl position={ControlPosition.BLOCK_START_INLINE_START}>
            <button 
              type="button" 
              onClick={handleMapType} 
              className="nav-buttons" 
              aria-label={mapType ? "Switch to standard map" : "Switch to traffic map"}
              aria-pressed={mapType}
            >
              {mapType ? <TrafficIcon className="nav-icons"/> : <PublicIcon className="nav-icons"/>}
            </button>
          </MapControl>
          {home && (
            <AdvancedMarker position={home} />
          )}
        </GoogleMap>
        {home && destHistory.length > 0 && 
          <div className="table-overlay">
            <DestInfoTable
              apiKey={apiKey}
              home={home}
              destinations={destHistory}
            />
          </div>
        }
      </div>
    </APIProvider>
  );
}
