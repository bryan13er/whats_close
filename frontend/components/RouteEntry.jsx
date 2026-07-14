import { useRouteCache } from '../hooks/useRouteCache';
import { useEffect } from "react";
import { useMapFeatures } from '../context/MapContext';
import { Polyline } from './polyline';
import { MAP_CONFIG } from '../config/maps';

import {
  AdvancedMarker, Pin, useMap
} from '@vis.gl/react-google-maps';


/**
 * @typedef {import('../types').Place} Place
 * @typedef {import('../types').RouteOptions} RouteOptions
 */

// TODO: clean up this entire color mess
const defaultAppearance = {
  walkingPolylineColor: '#1E90FF',  // Dodger Blue for walking
  defaultPolylineColor: '#007BFF',  // Slightly darker blue for transit / default
  stepMarkerFillColor: '#FFFFFF',   // White markers for steps
  stepMarkerBorderColor: '#1E90FF', // Blue border to match walking polyline
  test: '#ffff66'
};

const DEFAULT_ROUTE_OPTIONS = { travelMode: 'DRIVE' };
const DODGER_BLUE = '#1E90FF'

/**
 * Renders a single route's polyline + destination marker.
 *
 * @param {Object} props
 * @param {Place} props.destination
 * @param {number} props.index               - position in `activeRoutes`; used to pick a color from `defaultColors`
 * @param {RouteOptions} props.routeOptions
 */
//TODO: fix this prop name difference
export default function RouteEntry({destination, index:routeIndex, color:activeColor = DODGER_BLUE, routeOptions = DEFAULT_ROUTE_OPTIONS, isMainRoute=false}) {
  const { route } = useRouteCache(destination, routeOptions)
  const { setRouteBounds } = useMapFeatures();
  const map = useMap();

  // without this useEffect the app will enter a infinte rerender
  useEffect(() => {
    if (!isMainRoute || !route?.viewport || !map) return;

    if (!map){
      console.warn("StreetViewWatcher: 'map' instance not found. Ensure this component is inside <GoogleMap>.");
      return;
    }

    const { high, low } = route.viewport;
    const bounds = {
      north: high.latitude,
      south: low.latitude,
      east: high.longitude,
      west: low.longitude,
    };

    map.fitBounds(bounds, MAP_CONFIG.routePadding);
    setRouteBounds(bounds);
  }, [isMainRoute, route, map]);

  if (!route) return null;

  const routeSteps = route.legs[0]?.steps || [];
  const appearance = {...defaultAppearance};

  // generate polylines i.e. coordinates for route on map
  const polylines = routeSteps.map((step, index) => {
    const isWalking = step.travelMode === 'WALK';
    const color = isWalking
      ? appearance.test
      : (step?.transitDetails?.transitLine?.color ?? activeColor);

    return (
      <Polyline
        key={`${index}-polyline`}
        encodedPath={step.polyline.encodedPolyline}
        strokeWeight={isWalking ? 2 : 6}
        strokeColor={color}
        zIndex={routeIndex}
        strokeOpacity={isMainRoute ? 1 : 0.75}
      />
    );
  });

  //TODO: find a new final pin for main route or come up with a new design or colro 
  return (
    <>
      {/*TODO 
        need to render at least home point but if i render for all routes 
        there will be too many markers on top of home
       <AdvancedMarker position={home} /> */
      
       }

      {isMainRoute ?
        <AdvancedMarker position={destination}/> 
        :
        <AdvancedMarker position={destination}>
          <Pin 
            background={activeColor} 
            borderColor={'	#686868'} 
            glyphColor={'	#686868'}
            scale={0.65}
          />
        </AdvancedMarker>
      } 

      {polylines}
    </>
  )
}