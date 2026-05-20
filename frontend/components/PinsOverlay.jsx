
import {
  AdvancedMarker, Pin
} from '@vis.gl/react-google-maps';

import { useMapFeatures } from "../context/MapContext";
import { placesApi } from '../config/maps';

export default function PinsOverlay({}) {
  const {activePins, homeHistory, destHistory} = useMapFeatures();
  console.log("happens in pins");

  return Object.keys(activePins).map((placeId) => {
    console.log(placeId, homeHistory[placeId]);
    return <AdvancedMarker position={homeHistory[placeId]}/>
  });
}