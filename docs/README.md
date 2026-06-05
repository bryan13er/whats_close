# What's Close

A location-based route comparison tool. Pick an origin and one or more destinations, then compare travel time and distance across drive / walk / transit modes side by side, along with place ratings and price level.

> **Audience for this doc:** future contributors (and future you). Covers what's in the repo, how the pieces fit, and where the moving parts are.

---

## Tech stack

| Layer | What |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Material UI 7, `@vis.gl/react-google-maps` |
| Backend | Express 5 — currently a placeholder (single `/test` route) |
| External APIs | Google Maps JS SDK + Routes / Routes Matrix / Places (v1) / Geocode REST APIs |
| Build / lint | `npm` scripts, ESLint via `eslint-config-next` |
| Testing | None configured |

The frontend talks directly to Google APIs from the browser. The backend is reserved for future server-side work that needs to hide a key or run a server-only flow (e.g., the v3 Geocode API which can't carry an HTTP-referrer restriction).

---

## Repo layout

```
whats_close/
├── frontend/
│   ├── app/                       Next.js App Router entry (page, layout, globals)
│   ├── components/                React components (.jsx) and their CSS
│   ├── context/                   MapContext — global state provider
│   ├── hooks/                     Custom hooks (data fetching, map events)
│   ├── lib/                       Shared utilities — API clients, error class, request wrapper
│   ├── utils/                     Pure helpers (time, distance, places transforms)
│   ├── config/                    Map config + API client instances
│   ├── routes-api.ts              Raw Routes API wrapper
│   ├── routes-matrix-api.js       Raw Routes Matrix API wrapper
│   └── place-api.js               Raw Places API wrapper (place details)
├── backend/
│   └── server.js                  Express placeholder
└── docs/                          Design docs and notes
```

---

## Setup

```bash
# Install once at the root for the workspace conveniences
# (frontend and backend each have their own node_modules; npm install in each subfolder)
cd frontend && npm install && cd ..
cd backend  && npm install && cd ..
```

Required env vars in `frontend/.env`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_KEY=<your Maps JS + Places + Routes key>
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=<a Map ID from Google Cloud>
# Optional — only needed if PlacesAPI.getGeocodeV3() is called.
# v3 doesn't support HTTP-referrer restrictions so this key needs different protection.
NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY=<separate geocoding key>
NEXT_PUBLIC_BACKEND_URL=<currently unused but reserved>
```

`config/maps.js` validates `NEXT_PUBLIC_GOOGLE_MAPS_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` at module-load and throws with an actionable message if either is missing.

> **Next.js gotcha:** `NEXT_PUBLIC_*` vars are inlined into the client bundle at build time. If you change `.env`, restart the dev server. Validation must use static literal access (`process.env.NEXT_PUBLIC_FOO`) — dynamic access (`process.env[name]`) is not inlined and resolves to `undefined` in the browser.

---

## Commands

```bash
# Frontend
npm --prefix frontend run dev        # dev server (http://localhost:3000)
npm --prefix frontend run build
npm --prefix frontend run lint
npm --prefix frontend run lint:fix

# Backend
npm --prefix backend run start       # http://localhost:3001 (placeholder)

# Root convenience aliases
npm run frontend:dev
npm run backend:start
```

No test suite is wired up.

---

## Architecture at a glance

```
                     ┌─────────────────────┐
                     │  MapFeatureProvider │   global state
                     │     (MapContext)    │
                     └──────────┬──────────┘
                                │ useMapFeatures()
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
       ┌────────┐         ┌──────────┐       ┌──────────────┐
       │ NavPill│         │MapView   │       │LocationDrawer│
       └────┬───┘         └────┬─────┘       └──────┬───────┘
            │                  │                    │
   place autocomplete   GoogleMap + markers   list of LocationCards
   + geocode lookup     + Route polylines     (per destination)
                        + StreetView / etc.

                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────────┐  ┌───────────────┐
        │  Route   │      │MultiRoutes   │  │useDestinations│
        │ (legacy) │      │ ─→ RouteEntry│  │   (hook)      │
        └────┬─────┘      └─────┬────────┘  └──────┬────────┘
             │                  │                  │
             ▼                  ▼                  ▼
        Routes API     useRouteCache hook    Routes Matrix API
                       → routesCache ref     + Places API
                                             (in-hook cache ref)
```

### State (MapContext)

Single context holds everything; no Redux/Zustand. Components read via `useMapFeatures()`. Key fields:

| Field | Type | Meaning |
|---|---|---|
| `home` | place \| null | Origin (set via NavPill) |
| `destination` | place \| null | The "active" route — destined to be the only route with `TRAFFIC_AWARE` once `route.tsx` is retired |
| `destHistory` | {place.placeId:place} | All searched destinations (drives the drawer + table) |
| `activeRoutes` | place[] | Destinations currently drawn as polylines on the map |
| `routesCache` | useRef({}) | Polyline cache keyed `${homeId}_${destId}` (used by `useRouteCache`) |
| `routeBounds` | LatLngBoundsLiteral | Last fitted bounds for recenter |
| `mapCenter` | LatLng | Map's controlled center |
| `isStreetViewVisible` | boolean | Hides UI when in street view |
| `mapType` | boolean | true = roadmap, false = hybrid |
| `showDataTable` | boolean | Toggles `DestInfoTable` visibility |
| `destRows` | row[] | Table data — produced by `useDestinations` and re-exposed through context |

Memoized handlers (`useCallback`) keep the context value stable so `React.memo`'d consumers don't re-render on every state change.

### Data flow

1. **User types in NavPill** → debounced `places.autocomplete()` → suggestion list.
2. **User selects a suggestion** → `places.getGeocodeV3(placeId)` for lat/lng → `handleHomeSelect()` (origin) or `addDestination()` (dest).
3. **`useDestinations(home, destinations)`** runs:
   - Filters out destinations equal to the home placeId.
   - Identifies which destinations are missing from its **internal cache** (`places + routes`) for the current home.
   - Concurrently fetches missing place details (Places API) + missing matrix data for DRIVE/WALK/TRANSIT (Routes Matrix API).
   - Writes results into the cache, then assembles `destRows` via `prepRowData()`.
4. **`MapView`** renders the `<GoogleMap>`, overlays (`NavPill`, controls, drawer), markers for home/destination, and polylines via `<MultiRoutes>`.
5. **`LocationCard`** lets the user "Set Route" (`setDestination` → primary route) or "Highlight Route" (`toggleActiveRoute` → adds to `activeRoutes`).
6. **`MultiRoutes` → `RouteEntry` → `useRouteCache`** fetches polylines from the Routes API, caching results in `routesCache` (different cache from `useDestinations`).

### Two caches — don't confuse them

| Cache | Lives in | Stores | Key | Fed by |
|---|---|---|---|---|
| `cache` ref (local) | `useDestinations.js` | Place details + Routes Matrix results | `placeId`, `${homeId}_${destId}` | Places API + Routes Matrix API |
| `routesCache` ref (shared) | `MapContext` | Full polyline route objects | `${homeId}_${destId}` | Routes API (via `useRouteCache`) |

Both happen to use the same key shape (`${homeId}_${destId}`) but are completely separate refs storing different data.

### Caching strategy

- Both caches are `useRef({...})` — survive component re-renders, never trigger re-renders on writes.
- The `useDestinations` cache lives for the lifetime of the provider. The Routes API cache (`routesCache`) lives in context for the same reason.
- No eviction yet (`TODO: cache garbage collection` in `useDestinations.js`).

---

## API clients

Four classes, all wrapped over `fetch`. With the foundation branch (`feature/api-error-foundation`) merged, all four go through `lib/apiRequest.js` (timeout, retry, abort, Google error parsing).

| Class | File | Endpoint |
|---|---|---|
| `RoutesApi` | `routes-api.ts` | Routes API — full polyline + legs |
| `RoutesMatrixAPI` | `routes-matrix-api.js` | Routes Matrix API — distance + time matrix |
| `PlacesApi` | `place-api.js` | Places v1 — `getPlaceDetails(placeId)` |
| `PlacesAPI` | `lib/AutoCompleteAPI.js` | Places v1 autocomplete + Geocode v4/v3 |

> Note the two `PlacesApi` / `PlacesAPI` classes — different files, different scopes, different capitalization. Easy to misimport. See the audit doc for refactoring suggestions.

Instances are created and exported once in `config/maps.js`:

```js
export const routesApiClient = new RoutesApi(MAP_CONFIG.apiKey);
export const routesMatrixApi = new RoutesMatrixAPI(MAP_CONFIG.apiKey);
export const placesApi = new PlacesApi(MAP_CONFIG.apiKey);
```

Consumers should always import these — never instantiate their own.

---

## Conventions

- Components use `.jsx` and PascalCase. Utilities use `.js` and camelCase.
- Every client component has `"use client"` at the top (App Router).
- CSS lives in a sibling `.css` file imported by the component (no CSS modules, no Tailwind).
- Browser-exposed env vars use the `NEXT_PUBLIC_` prefix.
- Underscore-prefixed identifiers (`_unused`) are exempt from `no-unused-vars`.
- API clients accept a trailing `{ signal }` options object so callers can cancel stale requests.

---

## Status / known limitations

- **`route.tsx`** still renders the primary route but is planned for retirement — see `docs/route-unification.md`. Don't add features to it.
- **No tests.**
- **Backend is a placeholder.** Single `/test` endpoint, no real routes wired up.
- **Console logging** is sprinkled through hot paths (table destRows, fetched payloads). Useful while debugging, noise in production.
- **`@react-google-maps/api`** is in `package.json` but unused (only `@vis.gl/react-google-maps` is imported).
- **No accessibility audit** — the viewport meta locks `userScalable=false`, which blocks pinch-zoom for low-vision users.

See `docs/audit.md` for a deeper review with refactoring suggestions, and `docs/route-unification.md` for the plan to merge `route.tsx` into the multi-route pipeline.
