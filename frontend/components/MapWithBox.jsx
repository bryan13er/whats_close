"use client";

import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useRef, useState } from "react";
import "./MapWithBox.css";

const LIBRARIES = ["places"];
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

function StatusOverlay({ message }) {
  return <div className="overlay-box">{message}</div>;
}

export default function MapWithBox({ center }) {
  const [mapCenter, setMapCenter] = useState(center || DEFAULT_CENTER);
  const inputRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey || "",
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      }
    );
  }, []);

  useEffect(() => {
    if (!isLoaded || !window.google || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["geocode"], // restrict to addresses
      componentRestrictions: { country: "us" },
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;

      setMapCenter({
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      });
    });

    return () => {
      if (listener) listener.remove();
    };
  }, [isLoaded]);

  if (!apiKey) {
    return <StatusOverlay message="Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in frontend/.env to load the map." />;
  }

  if (!mapId) {
    return <StatusOverlay message="Set NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID in frontend/.env to use Advanced Markers." />;
  }

  if (!isLoaded) {
    return <StatusOverlay message="Loading map..." />;
  }

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerClassName="map-canvas"
        center={mapCenter}
        zoom={12}
        mapId={mapId}
      />

      <div className="overlay-layer">
        <div className="search-box">
          <input
            type="text"
            ref={inputRef}
            placeholder="Where from..."
            aria-label="Search destination"
          />
        </div>
      </div>
    </div>
  );
}
