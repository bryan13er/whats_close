import { useMapFeatures } from '../context/MapContext';
import RouteEntry from './RouteEntry';

/* think about how to improve this later*/
const routeOptions = {
  travelMode: 'DRIVE',
};

export default function MultiRoutes() {
const {activeRoutes, destHistory, rows} = useMapFeatures();

const activeDests = Object.keys(activeRoutes).map(placeId => destHistory[placeId])

if(activeDests.length === 0) return null;

// TODO: come back to converting rows into being hashed by placeId as well
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
