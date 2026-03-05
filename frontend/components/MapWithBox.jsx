"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  ControlPosition,
  Map,
  MapControl,
  useMap,
} from "@vis.gl/react-google-maps";
import {RoutesApi} from '../routes-api';
import "./MapWithBox.css";
import Autocomplete from "./Autocomplete";
import Route from './route'
import HomeIcon from '@mui/icons-material/Home';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import NavigationIcon from '@mui/icons-material/Navigation';

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
      map.setZoom(14);
    }
  };

  return (
    <MapControl position={ControlPosition.RIGHT_BOTTOM}>
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

export default function MapWithBox({ center }) {
  const initialPosition = center || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialPosition);
  const [home, setHome]               = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null); // needed for recenter button
  const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
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
      setZoom(14);
    }
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
        <Map
          style={MAP_STYLE}
          center={mapCenter}
          zoom={zoom}
          mapId={mapId}
          streetViewControl
          cameraControl={false}
          mapTypeControl={false}
          fullscreenControl
          
          onCameraChanged={(ev) => {
            setMapCenter(ev.detail.center);
            setZoom(ev.detail.zoom); 
          }}
        >
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
          
          {home && (
            <AdvancedMarker position={home} />
          )}
          
        </Map>
      </div>
    </APIProvider>
  );
}
