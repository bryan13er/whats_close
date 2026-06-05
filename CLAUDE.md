# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend (Next.js):**
```bash
npm --prefix frontend run dev        # Start dev server
npm --prefix frontend run build      # Production build
npm --prefix frontend run lint       # Run ESLint
npm --prefix frontend run lint:fix   # Auto-fix lint issues
```

**Backend (Express):**
```bash
npm --prefix backend run start       # Start Express server on port 3001
```

**Root shortcuts:**
```bash
npm run frontend:dev
npm run backend:start
```

No test suite is configured.

## Architecture

**What's Close** is a location-based route finder. Users input an origin and one or more destinations, then compare travel distance and time across drive/walk/transit modes, along with place ratings and cost.

### Monorepo Layout

- `/frontend` — Next.js 15 app (React 19, MUI 7, Google Maps)
- `/backend` — Express 5 server (minimal; currently a placeholder)

### State Management

`MapFeatureProvider` (`frontend/context/MapContext.js`) wraps the entire app and holds all global map/route state. Components access it via `useMapFeatures()`. There is no Redux or Zustand — all shared state lives in this single context.

### Data Flow

1. **Input** — `NavPill` renders an origin + destination autocomplete using `AutoCompleteAPI` (wraps Google Places Autocomplete). On mobile (< 768px) it renders a full-screen overlay; on desktop it renders an inline pill.

2. **Fetching** — `useDestinations` hook is the core data-fetching layer:
   - Fetches place details (rating, price) via Places API
   - Fetches route data (distance, duration per travel mode) via Routes Matrix API
   - Uses `useRef`-based caches to avoid redundant API calls when the user switches origins or destinations

3. **Map** — `MapView` is the central map container using `@vis.gl/react-google-maps`. It renders home/destination markers, route polylines via `MultiRoutes → RouteEntry`, a street view panel, map type toggle, and a recenter button.

4. **Table** — `DestInfoTable` displays the fetched route/place data in a comparison table.

5. **History drawer** — `LocationDrawer` renders a `LocationCard` per entry in `destHistory`. On desktop it is a persistent right-side panel; on mobile it is a swipeable bottom drawer.

### Two Caches — Don't Confuse Them

There are two independent caches that serve different data:

| Cache | Lives in | Stores | Used by |
|---|---|---|---|
| `cache` ref | `useDestinations` (local) | Places details + Routes Matrix results (distance, duration, ratings) | `DestInfoTable` destRows |
| `routesCache` ref | `MapContext` (shared) | Full polyline route objects from the Routes API | `useRouteCache` → `RouteEntry` |

They use the same key format (`homeId_destId`) but are completely separate objects.

### `destination` vs `activeRoutes`

Both live in `MapContext`:

- `destination` — the single primary route set by the user ("Set Route"). Intended to receive `TRAFFIC_AWARE` routing (expensive). Only one at a time.
- `activeRoutes` — array of all destinations currently drawn as polylines on the map. Includes `destination` plus any additionally highlighted routes that use standard (non-traffic) routing.

### Key Files

| File | Purpose |
|---|---|
| `frontend/context/MapContext.js` | Global state provider |
| `frontend/hooks/useDestinations.js` | Matrix data fetching with internal places+routes cache |
| `frontend/hooks/useRouteCache.js` | Polyline fetching with `routesCache` from context |
| `frontend/components/NavPill.jsx` | Origin/destination input (desktop + mobile overlay) |
| `frontend/components/MapView.jsx` | Map container and route rendering |
| `frontend/components/MultiRoutes.jsx` | Renders one `RouteEntry` per active route |
| `frontend/components/RouteEntry.jsx` | Single route polyline, reads from `useRouteCache` |
| `frontend/components/LocationDrawer.jsx` | History drawer (desktop panel / mobile bottom sheet) |
| `frontend/components/LocationCard.jsx` | Per-destination card with actions |
| `frontend/components/DestInfoTable.jsx` | Travel comparison table |
| `frontend/config/maps.js` | Centralized Google Maps config + API client instances |
| `frontend/lib/AutoCompleteAPI.js` | Google Places autocomplete + geocoding client |
| `frontend/routes-api.ts` | Raw Routes API wrapper (polylines) — see note below |
| `frontend/routes-matrix-api.js` | Raw Routes Matrix API wrapper (distance/time) |
| `frontend/place-api.js` | Raw Places API wrapper (ratings, price) |
| `frontend/utils/places.js` | Data transformation helpers for Places API responses |

> **Note:** `route.tsx` is the current renderer for the primary route but is planned for retirement — see `docs/route-unification.md`. Do not build new features on top of it.

### Conventions

- All component files are `.jsx` (PascalCase); utilities are `.js` (camelCase).
- Every client component has `"use client"` at the top (Next.js App Router).
- Browser-accessible env vars use `NEXT_PUBLIC_` prefix — `NEXT_PUBLIC_GOOGLE_MAPS_KEY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` live in `frontend/.env`.
- Underscore-prefixed variables (e.g. `_unused`) are intentionally ignored by the ESLint `no-unused-vars` rule.
- Concurrent API calls use `Promise.all` for performance.
