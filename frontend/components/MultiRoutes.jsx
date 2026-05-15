import { useMapFeatures } from '../context/MapContext';
import RouteEntry from './RouteEntry';

/* think about how to improve this later*/
const routeOptions = {
  travelMode: 'DRIVE',
};

export default function MultiRoutes() {
const {activeRoutes, destHistory, rows} = useMapFeatures();
// TODO: revist turning destHistory into a object although I remeber that proved to be quite challenging
const activeDests = destHistory.filter(dest => dest.placeId in activeRoutes);

if(activeDests.length === 0) return null;

const activeDestsDist = rows.filter(row => row.desPlaceId in activeRoutes);

const distByPlaceId = activeDestsDist.reduce((acc, row) => {
  acc[row.desPlaceId] = row.distance;
  return acc;
}, {});

activeDests.sort((a, b) => distByPlaceId[b.placeId] - distByPlaceId[a.placeId]);
  
return activeDests.map((dest,index) => (
    <RouteEntry
      key={dest.placeId}
      destination={dest}
      index={index}
      color={activeRoutes[dest.placeId]}
      routeOptions={routeOptions}
    />
));

}
