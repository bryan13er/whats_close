"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map,
  Pin,
} from "@vis.gl/react-google-maps";
import "./MapWithBox.css";
import Autocomplete from "./Autocomplete";
import HomeIcon from '@mui/icons-material/Home';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const MAP_STYLE = { width: "100%", height: "100%" };
const LIBRARIES = ["places"];

function StatusOverlay({ message }) {
  return <div className="overlay-box">{message}</div>;
}

export default function MapWithBox({ center }) {
  const initialPosition = center || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialPosition);
  const [markerPosition, setMarkerPosition] = useState(initialPosition);
  const [showHome, setShowHome] = useState(true)
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
      setMarkerPosition(userPosition);
      setZoom(13);
    });
  }, []);

  if (!apiKey) return <StatusOverlay message="Missing API key in frontend/.env" />;
  if (!mapId) return <StatusOverlay message="Missing map ID in frontend/.env" />;

  const handlePlaceSelect = (location) => {
    setMapCenter({ lat: location.lat, lng: location.lng });
    setMarkerPosition({ lat: location.lat, lng: location.lng });
    setShowHome(false);
    setZoom(14);
  };

  const handleHomeClick = () => {
    setShowHome(true);
  }

  return (
    <APIProvider apiKey={apiKey} libraries={LIBRARIES}>
      <div className="map-container">
        {showHome ? (
          <div className="search-overlay">
            <Autocomplete onPlaceSelect={handlePlaceSelect} />
          </div>
        ) : (
          <button type="button" onClick={handleHomeClick} className="home-button" aria-label="Go home">
            <HomeIcon className="home-icon" />
          </button>
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
          <AdvancedMarker position={markerPosition}>
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
