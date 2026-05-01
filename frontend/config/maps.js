// src/config/maps.js
import { RoutesApi } from '../routes-api';
import { RoutesMatrixAPI } from '../routes-matrix-api';
import { PlacesApi } from '../place-api';

/**
 * Fail-fast env validation. Throws at module-load time with a clear, actionable
 * message instead of letting `undefined` keys propagate into API calls and surface
 * as cryptic 400s deep in the call stack.
 *
 * IMPORTANT: Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when
 * accessed via static literal (e.g. `process.env.NEXT_PUBLIC_FOO`). Dynamic access
 * like `process.env[name]` is NOT inlined and resolves to undefined in the client
 * bundle. So requireEnv takes the already-resolved value as an argument.
 * See: https://nextjs.org/docs/pages/building-your-application/configuring/environment-variables
 */
function requireEnv(name, value) {
  if (!value) {
    throw new Error(
      `[config/maps] Missing required env var: ${name}. ` +
      `Add it to frontend/.env (browser-exposed vars must use the NEXT_PUBLIC_ prefix), ` +
      `then restart the dev server.`
    );
  }
  return value;
}

const GOOGLE_MAPS_KEY = requireEnv('NEXT_PUBLIC_GOOGLE_MAPS_KEY', process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
const GOOGLE_MAPS_MAP_ID = requireEnv('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID', process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID);

export const MAP_CONFIG = {
  apiKey: GOOGLE_MAPS_KEY,
  mapId: GOOGLE_MAPS_MAP_ID,
  mapStyle: { width: "100%", height: "100%" },
  defaultCenter: { lat: 37.7749, lng: -122.4194 },
  defaultZoom: 14,
  libraries: ["places"],
  // when calculating how to show route
  routePadding: {
    top: 140,    // Height of NavPill + buffer
    bottom: 40,  // Buffer for the bottom of the map
    left: 40,
    right: 40
  }
};

// clients for api call fetches
export const routesApiClient = new RoutesApi(MAP_CONFIG.apiKey);
export const routesMatrixApi = new RoutesMatrixAPI(MAP_CONFIG.apiKey);
export const placesApi = new PlacesApi(MAP_CONFIG.apiKey);