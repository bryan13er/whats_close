import MapView from "../components/MapView";
import { MapFeatureProvider } from "../context/MapContext";

export default function Home() {
  return (
    <MapFeatureProvider>
      <MapView />
    </MapFeatureProvider>
  );
}
