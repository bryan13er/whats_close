"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";
import {RoutesApi} from '../routes-api';
import "./MapWithBox.css";
import Autocomplete from "./Autocomplete";
import Route from './route'
import HomeIcon from '@mui/icons-material/Home';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const MAP_STYLE = { width: "100%", height: "100%" };
const LIBRARIES = ["places"];

const apiClient = new RoutesApi(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
const routeOrigin = { lat: 36.6177, lng: -121.9166 };
const routeDestination = { lat: 36.6111, lng: -121.8219 };

const appearance = {
  walkingPolylineColor: '#000',
  defaultPolylineColor: '#7c7c7c',
  stepMarkerFillColor: '#333333',
  stepMarkerBorderColor: '#000000'
};


const routeOptions = {
  travelMode: 'DRIVE',
  // RoutingPreference: 'TRAFFIC_AWARE'
}

const mapOptions = {
  mapId: '49ae42fed52588c3',
  defaultCenter: {lat: 22, lng: 0},
  defaultZoom: 3,
  gestureHandling: 'greedy',
  disableDefaultUI: true
};


function StatusOverlay({ message }) {
  return <div className="overlay-box">{message}</div>;
}

export default function MapWithBox({ center }) {
  const initialPosition = center || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialPosition);
  const [homeMarker, setHomeMarker] = useState(initialPosition);
  const [showHomeSearch, setShowHomeSearch] = useState(true);
  const [home, setHome] = useState(initialPosition);
  const [destination, setDestination] = useState(null);
  const [destinationMarker, setDestinationMarker] = useState(null);
  const [destinations, setDestinations] = useState([]);
  const [zoom, setZoom] = useState(12);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      const userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      setMapCenter(userPosition);
      setHomeMarker(userPosition);
      setHome(position);
      setZoom(13);
    });
  }, []);

  if (!apiKey) return <StatusOverlay message="Missing API key in frontend/.env" />;
  if (!mapId) return <StatusOverlay message="Missing map ID in frontend/.env" />;

  const handleHomeSelect = (location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setHomeMarker({ lat: location.lat, lng: location.lng });
    setShowHomeSearch(false);
    setHome(location)
    setZoom(14);
  };

  const handleDestinationSelect = (location) => {
    // setMapCenter({ lat: location.lat, lng: location.lng });
    setDestination(location);
    setDestinationMarker({ lat: location.lat, lng: location.lng })
    setDestinations((prev) => [...prev, location]);
    setZoom(14);
  };

  useEffect(() => {
    console.log(destinations);
  },[destinations]);

  const handleHomeClick = () => {
    setShowHomeSearch(true);
  }

  return (
    <APIProvider apiKey={apiKey} libraries={LIBRARIES}>
      <div className="map-container">
        {showHomeSearch ? (
          <div className="search-overlay search-overlay--top">
            <Autocomplete onPlaceSelect={handleHomeSelect} placeholder="Where from..." />
          </div>
        ) : (
          <button type="button" onClick={handleHomeClick} className="home-button" aria-label="Go home">
            <HomeIcon className="home-icon" />
          </button>
        )}
        {!showHomeSearch && destination == null && (
            <div className="search-overlay search-overlay--top">
              <Autocomplete onPlaceSelect={handleDestinationSelect} />
          </div>
        )}
        <Map
          style={MAP_STYLE}
          center={mapCenter}
          zoom={zoom}
          mapId={mapId}
          onCameraChanged={(ev) => {
            setMapCenter(ev.detail.center);
            setZoom(ev.detail.zoom); // This stops the "snapping" back to 12
          }}
        >
          {homeMarker && destinationMarker &&
            <Route
              apiClient={apiClient}
              origin={homeMarker}
              destination={destinationMarker}
              routeOptions={routeOptions}
              appearance={appearance}
            />
          } 
          
          <AdvancedMarker position={homeMarker}>
            <div className="custom-marker-pin">
              <Pin 
                background={'#EA4335'} 
                borderColor={'#B31412'} 
                glyphColor={'#000000'} 
              />
            </div>
          </AdvancedMarker>
        </Map>
      </div>
    </APIProvider>
  );
}
