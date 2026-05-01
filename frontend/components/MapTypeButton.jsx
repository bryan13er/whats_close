import { useMapFeatures } from "../context/MapContext";
import { ControlPosition, MapControl } from "@vis.gl/react-google-maps"
import "./MapView.css";
import TrafficIcon from '@mui/icons-material/Traffic';
import PublicIcon from '@mui/icons-material/Public';

export default function MapTypeButton() {
  const {mapType, toggleMapType} = useMapFeatures();

  return (
    <MapControl position={ControlPosition.BLOCK_START_INLINE_START}>
      <button 
        type="button" 
        onClick={toggleMapType} 
        className="nav-buttons" 
        aria-label={mapType ? "Switch to standard map" : "Switch to traffic map"}
        aria-pressed={mapType}
      >
        {mapType ? <TrafficIcon className="nav-icons"/> : <PublicIcon className="nav-icons"/>}
      </button>
    </MapControl>
  );
}