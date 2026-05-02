import { useMapFeatures } from '../context/MapContext';
import RouteEntry from './RouteEntry';

/* think about how to improve this later*/
const routeOptions = {
  travelMode: 'DRIVE',
};

export default function MultiRoutes() {
const {activeRoutes} = useMapFeatures();

if(activeRoutes.length === 0){
  return null;
}

return activeRoutes.map((dest,index) => (
    <RouteEntry
      key={dest.placeId}
      destination={dest}
      index={index}
      routeOptions={routeOptions}
    />
));

}
