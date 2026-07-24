"use client";

import { useEffect } from "react";
import {
  APIProvider,
  AdvancedMarker,
  Map as GoogleMap,
} from "@vis.gl/react-google-maps";
import "./MapView.css";

import RecenterRouteButton from "./RecenterRouteButton";
import { MAP_CONFIG } from '../config/maps';
import { useMapFeatures } from "../context/MapContext";
import MapTypeButton from "./MapTypeButton";
import StreetViewWatcher from "./StreetViewWatcher";
import MapCenterControl from "./MapCenterControl";
import NavPill from "./NavPill";
import LocationDrawer from "./LocationDrawer";
import MultiRoutes from "./MultiRoutes";
import PinsOverlay from "./PinsOverlay";
import RouteEntry from "./RouteEntry";


const routeOptions = {
  travelMode: 'DRIVE',
  // RoutingPreference: 'TRAFFIC_AWARE'
}


// TODO: there is a big problem the component rerenders everytime i move the map
// so its leading to a crash becasue its running out o memory consult the
// docs and see how to properly set center
export default function MapView() {
  // console.log("🛠️ MapView Rendered"); // Add this

  // get from context provider
  const {
    home,
    destination,
    setMapCenter,
    mapType, 
    destHistory,
    homeHistory,
    activePins,
  } = useMapFeatures();

  console.log("🛠️ MapView Rendered", {
    home,
    destination,
    mapType,
    destHistoryKeys: Object.keys(destHistory).length,
    activePinsKeys: Object.keys(activePins).length,
    time: performance.now().toFixed(2),
  });


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
            <RouteEntry
              destination={destination}
              index={50}
              isMainRoute={true}
            />
          }

          {home && Object.keys(destHistory).length > 0
            && <MultiRoutes />}

          <RecenterRouteButton/>
          <MapTypeButton/>

         
          {home && (
            <AdvancedMarker position={home} >
              <div style={{
                width: '26px',
                height: '26px',
                backgroundColor: '#FFFFFF', // White fill
                border: '6px solid #0F9D58', // Blue border (Dodger Blue)
                borderRadius: '50%',        // Makes it a perfect circle
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)', // Optional: subtle shadow to make it pop
                cursor: 'pointer'
              }} />
            </AdvancedMarker>
          )}

          {Object.keys(activePins).length > 0 && 
            <PinsOverlay/>
          }
        </GoogleMap>
        <LocationDrawer/>
      </div>
    </APIProvider>
  );
}
