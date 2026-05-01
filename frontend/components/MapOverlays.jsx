
import { useMapFeatures } from "../context/MapContext";
import Autocomplete from "./Autocomplete";
import "./MapView.css";

import HomeIcon from '@mui/icons-material/Home';
import NavigationIcon from '@mui/icons-material/Navigation';

export default function MapOverlays() {
  const {
    home, handleHomeSelect, handleHomeClear,
    destination, addDestination, clearRoute,
    isStreetViewVisible,
  } = useMapFeatures();

  // If Street View is open, we don't render any of our custom UI overlays
  if (isStreetViewVisible) return null;

  return (
    <>
      {/* Search & Navigation UI */}
      <div className="search-overlay search-overlay--top">
        {!home ? (
          <Autocomplete onPlaceSelect={handleHomeSelect} placeholder="Where from..." />
        ) : (
          <div className="flex-row">
            <button onClick={handleHomeClear} className="nav-buttons home-button"><HomeIcon /></button>
            {!destination && <Autocomplete onPlaceSelect={addDestination} />}
          </div>
        )}
      </div>

      {home && destination && (
        <button onClick={clearRoute} className="nav-buttons dest-button">
          <NavigationIcon />
        </button>
      )}
    </>
  );
}