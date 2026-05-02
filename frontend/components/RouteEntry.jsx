import { useRouteCache } from '../hooks/useRouteCache';
import { useMapFeatures } from '../context/MapContext';
import { Polyline } from './polyline';
import { defaultColors } from '../MapStyling/RouteColors';

import {
  AdvancedMarker,
} from '@vis.gl/react-google-maps';

/**
 * @typedef {import('../types').Place} Place
 * @typedef {import('../types').RouteOptions} RouteOptions
 */

const defaultAppearance = {
  walkingPolylineColor: '#1E90FF',  // Dodger Blue for walking
  defaultPolylineColor: '#007BFF',  // Slightly darker blue for transit / default
  stepMarkerFillColor: '#FFFFFF',   // White markers for steps
  stepMarkerBorderColor: '#1E90FF', // Blue border to match walking polyline
  test: '#ffff66'

};

/**
 * Renders a single route's polyline + destination marker.
 *
 * @param {Object} props
 * @param {Place} props.destination
 * @param {number} props.index               - position in `activeRoutes`; used to pick a color from `defaultColors`
 * @param {RouteOptions} props.routeOptions
 */
export default function RouteEntry({destination, index:routeIndex, routeOptions}) {
  const { home } = useMapFeatures();
  const { route } = useRouteCache(destination, routeOptions)

  if (!route){
    return null;
  }

  const routeSteps = route.legs[0]?.steps || [];
  const appearance = {...defaultAppearance};

  const polylines = routeSteps.map((step, index) => {
    const isWalking = step.travelMode === 'WALK';
    const color = isWalking
      ? appearance.test
      : (step?.transitDetails?.transitLine?.color ?? defaultColors[routeIndex]);

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
      {/*TODO 
        need to render at least home point but if i render for all routes 
        there will be too many markers on top of home
       <AdvancedMarker position={home} /> */}
      <AdvancedMarker position={destination} />
      {polylines}
    </>
  )
}