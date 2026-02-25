"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  useMap,
} from "@vis.gl/react-google-maps";
import {RoutesApi} from '../routes-api';
import "./MapWithBox.css";
import Autocomplete from "./Autocomplete";
import Route from './route'
import HomeIcon from '@mui/icons-material/Home';
import MyLocationIcon from '@mui/icons-material/MyLocation';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const MAP_STYLE = { width: "100%", height: "100%" };
const LIBRARIES = ["places"];

const apiClient = new RoutesApi(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);

const routeOptions = {
  travelMode: 'DRIVE',
  // RoutingPreference: 'TRAFFIC_AWARE'
}

function StatusOverlay({ message }) {
  return <div className="overlay-box">{message}</div>;
}

function RecenterRouteButton({ routeBounds, home }) {
  const map = useMap();

  if (!routeBounds && !home) return null;

  return (
    <button
      type="button"
      className="recenter-button"
      aria-label="Recenter map"
      onClick={() => {
        if (!map) return;

        if (routeBounds) {
          map.fitBounds(routeBounds);
          return;
        }

        map.panTo(home);
        map.setZoom(14);
      }}
    >
      <MyLocationIcon className="recenter-icon" />
    </button>
  );
}

export default function MapWithBox({ center }) {
  const initialPosition = center || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialPosition);
  const [home, setHome]               = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null); // needed for recenter button
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
      setZoom(13);
    });
  }, []);

  if (!apiKey) return <StatusOverlay message="Missing API key in frontend/.env" />;
  if (!mapId) return <StatusOverlay message="Missing map ID in frontend/.env" />;

  const handleHomeSelect = (location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setHome(location);
    setZoom(14);
  };

  const handleDestinationSelect = (location) => {
    setDestination(location);
    setZoom(14);
  };


  const handleHomeClick = () => {
    setHome(null);
    setDestination(null);
    setRouteBounds(null);
  }

  return (
    <APIProvider apiKey={apiKey} libraries={LIBRARIES}>
      <div className="map-container">
        {!home ? (
          <div className="search-overlay search-overlay--top">
            <Autocomplete onPlaceSelect={handleHomeSelect} placeholder="Where from..." />
          </div>
        ) : (
          <button type="button" onClick={handleHomeClick} className="home-button" aria-label="Go home">
            <HomeIcon className="home-icon" />
          </button>
        )}
        {home && !destination && (
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
            setZoom(ev.detail.zoom); 
          }}
        >
          {home && destination &&
            <Route
              apiClient={apiClient}
              origin={home}
              destination={destination}
              routeOptions={routeOptions}
              onRouteBoundsChange={setRouteBounds}
            />
          }

          <RecenterRouteButton routeBounds={routeBounds} home={home} />
          
          {home && (
            <AdvancedMarker position={home} />
          )}
          
        </Map>
      </div>
    </APIProvider>
  );
}
