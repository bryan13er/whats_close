"use client";

import { useEffect } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
} from "@vis.gl/react-google-maps";
import "./MapWithBox.css";

import RecenterRouteButton from "./RecenterRouteButton";
import Route from './route'
import DestInfoTable from "./DestInfoTable";

import { MAP_CONFIG } from '../config/maps';
import { useMapFeatures } from "../context/MapContext";
import MapOverlays from "./MapOverlays";
import MapTypeButton from "./MapTypeButton";
import StreetViewWatcher from "./StreetViewWatcher";
import MapCenterControl from "./MapCenterControl";
import NavPill from "./NavPill";


const routeOptions = {
  travelMode: 'DRIVE',
  // RoutingPreference: 'TRAFFIC_AWARE'
}


//TODO: there is a big problem the component rerenders everytime i move the map
// so its leading to a crash becasue its running out o memory consult the
// docs and see how to properly set center
export default function MapWithBox() {
  console.log("🛠️ MapWithBox Rendered"); // Add this

  // get from context provider
  const {
    home,
    destination,
    setMapCenter,
    mapType, 
    destHistory, deleteFromHistory
  } = useMapFeatures();

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

  if (!MAP_CONFIG.apiKey) return <StatusOverlay message="Missing API key in frontend/.env" />;
  if (!MAP_CONFIG.mapId) return <StatusOverlay message="Missing map ID in frontend/.env" />;

  return (
    <APIProvider apiKey={MAP_CONFIG.apiKey} libraries={MAP_CONFIG.libraries}>
      <div className="map-container">
        {/* <MapOverlays/> */}
        <div className="nav-pill-overlay">
          <NavPill/>
        </div>
        <GoogleMap
          style={MAP_CONFIG.mapStyle}
          defaultCenter={MAP_CONFIG.defaultCenter}
          defaultZoom={MAP_CONFIG.defaultZoom}
          mapId={MAP_CONFIG.mapId}
          mapTypeId={mapType ? 'roadmap' : 'hybrid'}
          streetViewControl
          cameraControl={false}
          mapTypeControl={false}
          fullscreenControl
        >
          <MapCenterControl />
          <StreetViewWatcher/>

          {home && destination &&
            <Route
              routeOptions={routeOptions}
            />
          }

          <RecenterRouteButton/>
          <MapTypeButton/>

         
          {home && (
            <AdvancedMarker position={home} />
          )}
        </GoogleMap>
        {home && destHistory.length > 0 && !destination && 
          <div className="table-overlay">
            <DestInfoTable/>
          </div>
        }
      </div>
    </APIProvider>
  );
}
