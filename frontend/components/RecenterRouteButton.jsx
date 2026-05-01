
import "./MapView.css";
import { useMapFeatures } from "../context/MapContext"
import { ControlPosition, MapControl, useMap } from "@vis.gl/react-google-maps"
import { MAP_CONFIG } from '../config/maps';
import MyLocationIcon from '@mui/icons-material/MyLocation';

export default function RecenterRouteButton() {
  const {isStreetViewVisible, routeBounds, home} = useMapFeatures();
  const map = useMap();

  if (!map) return null;
  if (isStreetViewVisible) return null;
  if (!routeBounds && !home) return null;

  const handleRecenter = () => {
    if (routeBounds) {
      map.fitBounds(routeBounds, MAP_CONFIG.routePadding);
      return;
    }

    if (home) {
      map.panTo(home);
      map.setZoom(MAP_CONFIG.defaultZoom);
    }
  };

  return (
    <MapControl position={ControlPosition.INLINE_END_BLOCK_END}>
      <button
        type="button"
        className="map-control-button recenter-mapcontrol-button"
        aria-label="Recenter map"
        onClick={handleRecenter}
      >
        <MyLocationIcon className="nav-icons" />
      </button>
    </MapControl>
  );
}