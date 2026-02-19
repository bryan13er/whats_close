"use client";

import React, {useEffect, useState} from 'react';
import {
  AdvancedMarker,
  useMap
} from '@vis.gl/react-google-maps';

import {Polyline} from './polyline';
import {RoutesApi} from '../routes-api';

const defaultAppearance = {
  walkingPolylineColor: '#000000',
  defaultPolylineColor: '#9a1e45',
  stepMarkerFillColor: '#333333',
  stepMarkerBorderColor: '#000000'
};

type Appearance = typeof defaultAppearance;

export type RouteProps = {
  apiClient: RoutesApi;
  origin: {lat: number; lng: number};
  destination: {lat: number; lng: number};
  routeOptions?: any;
  appearance?: Partial<Appearance>;
};

const Route = (props: RouteProps) => {
  const {apiClient, origin, destination, routeOptions} = props;

  const [route, setRoute] = useState<any>(null);
  const [travelTime, setTravelTime] = useState<string>('');
  // 1. ADD STATE FOR DISTANCE
  const [distance, setDistance] = useState<string>('');

  const map = useMap();
  
  useEffect(() => {
    if (!map) return;

    console.log(origin);
    console.log(destination);

    apiClient.computeRoutes(origin, destination, routeOptions).then(res => {
      const [route] = res.routes;
      setRoute(route);

      const {high, low} = route.viewport;
      const bounds: google.maps.LatLngBoundsLiteral = {
        north: high.latitude,
        south: low.latitude,
        east: high.longitude,
        west: low.longitude
      };

      map.fitBounds(bounds);
    });
  }, [origin, destination, routeOptions, map, apiClient]);

  // 2. UPDATED USEEFFECT TO PARSE DURATION AND DISTANCE
  useEffect(() => {
    if (!route || !route.legs || !route.legs[0]) return;
  
    // Handle Time
    if (route.legs[0].duration) {
      const durationInSeconds = parseInt(route.legs[0].duration); 
      const hours = Math.floor(durationInSeconds / 3600);
      const minutes = Math.floor((durationInSeconds % 3600) / 60);
      setTravelTime(`${hours}h ${minutes}m`);
    }

    // Handle Distance (Meters to Miles)
    if (route.legs[0].distanceMeters) {
      const meters = route.legs[0].distanceMeters;
      const miles = (meters * 0.000621371).toFixed(1);
      setDistance(`${miles} mi`);
    }
  }, [route]);

  if (!route) return null;

  const routeSteps: any[] = route.legs[0]?.steps || [];
  const appearance = {...defaultAppearance, ...props.appearance};

  const polylines = routeSteps.map((step, index) => {
    const isWalking = step.travelMode === 'WALK';
    const color = isWalking
      ? appearance.walkingPolylineColor
      : (step?.transitDetails?.transitLine?.color ?? appearance.defaultPolylineColor);

    return (
      <Polyline
        key={`${index}-polyline`}
        encodedPath={step.polyline.encodedPolyline}
        strokeWeight={isWalking ? 2 : 6}
        strokeColor={color}
      />
    );
  });

  return (
    <>
      <AdvancedMarker position={origin} />
      <AdvancedMarker position={destination} />

      {polylines}

      {/* 3. UPDATED RENDER BOX WITH BOTH UNITS */}
      {travelTime && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: '8px 20px',
          borderRadius: '25px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontWeight: 'bold',
          color: '#333',
          fontSize: '14px',
          border: '1px solid #eee',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          whiteSpace: 'nowrap'
        }}>
          <span>⏱️ {travelTime}</span>
          <span style={{ color: '#ddd', fontWeight: 'normal' }}>|</span>
          <span>📍 {distance}</span>
        </div>
      )}
    </>
  );
};

export default React.memo(Route);
