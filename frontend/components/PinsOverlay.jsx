import {
  AdvancedMarker, Pin, InfoWindow,  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';

import { useMapFeatures } from "../context/MapContext";
import { useState, useCallback } from 'react';


export const MarkerWithInfoWindow = ({position}) => {
  // `markerRef` and `marker` are needed to establish the connection between
  // the marker and infowindow (if you're using the Marker component, you
  // can use the `useMarkerRef` hook instead).
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowShown, setInfoWindowShown] = useState(false);

  const [mainName, ...rest] = position.label.split(",");
  const restOfAddress = rest.join(",").trim() ;

  // clicking the marker will toggle the infowindow
  const handleMarkerClick = useCallback(
    () => setInfoWindowShown(isShown => !isShown),
    []
  );

  // if the maps api closes the infowindow, we have to synchronize our state
  const handleClose = useCallback(() => setInfoWindowShown(false), []);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={position}
        onClick={handleMarkerClick}
      >
        <Pin
          background={'#2563eb'}
          glyphColor={'#ffffff'}
          borderColor={'#1d4ed8'}
        />
      </AdvancedMarker>

      {infoWindowShown && (
        <InfoWindow anchor={marker} onClose={handleClose}>
          <div style={{ fontWeight: 'bold' }}>
            {mainName}
          </div>
          <div>
            {restOfAddress}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default function PinsOverlay({}) {
  const { activePins, homeHistory, destHistory, home} = useMapFeatures();
  console.log("happens in pins");

  return Object.keys(activePins).map((placeId) => {
    console.log(placeId, homeHistory[placeId]);

    if(placeId === home.placeId) return null;

    const historyItem = homeHistory[placeId];
    if (!historyItem) return null;

    return (
      <MarkerWithInfoWindow 
        key={placeId} 
        position={historyItem}
      />
    );
  });
}