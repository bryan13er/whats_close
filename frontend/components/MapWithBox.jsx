"use client";

import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import "./MapWithBox.css"; // import the CSS file

export default function MapWithBox({ center }) {
  const defaultCenter = center || { lat: 37.7749, lng: -122.4194 };
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [collapsed, setCollapsed] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setMapCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Keep default center if geolocation fails.
      }
    );
  }, []);

  if (!apiKey) {
    return (
      <div className="overlay-box">
        Set NEXT_PUBLIC_GOOGLE_MAPS_KEY in frontend/.env to load the map.
      </div>
    );
  }

  return (
    <LoadScript googleMapsApiKey={apiKey}>
      <div className="map-container">
        <GoogleMap
          mapContainerClassName="map-canvas"
          center={mapCenter}
          zoom={12}
        >
          <Marker position={mapCenter} />
        </GoogleMap>

        {/* Overlay box */}
        <div className={`overlay-box ${collapsed ? "collapsed" : ""}`}>
          <button
            type="button"
            className="collapse-button"
            onClick={() => setCollapsed((prev) => !prev)}
            aria-expanded={!collapsed}
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
          {!collapsed && <div>This is a box on top of the map</div>}
        </div>
      </div>
    </LoadScript>
  );
}
