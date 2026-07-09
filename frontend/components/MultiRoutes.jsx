import { useMapFeatures } from '../context/MapContext';
import RouteEntry from './RouteEntry';


export default function MultiRoutes() {
  const {home, destHistory, activeRoutes, travelCache} = useMapFeatures();

  const activeDests = Object.keys(activeRoutes).map(placeId => destHistory[placeId])

  if(activeDests.length === 0 || home === null) return null;

  // TODO: clean this up
  // order by distance in order to display in order distance
  activeDests.sort((a, b) => {
    // 1. Safely pull from the cache using optional chaining (?.)
    // 2. Use a fallback (??) just in case the data is still in-flight
    const distA = travelCache.current.routes[home.placeId]?.[a.placeId]?.drive?.distanceMeters ?? 0;
    const distB = travelCache.current.routes[home.placeId]?.[b.placeId]?.drive?.distanceMeters ?? 0;

    // FURTHEST TO CLOSEST
    return distB - distA; 
  });
    
  return activeDests.map((dest,index) => (
      <RouteEntry
        key={dest.placeId}
        destination={dest}
        index={index}
        color={activeRoutes[dest.placeId]}
      />
  ));
}
