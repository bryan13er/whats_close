# Route Rendering Unification + History Drawer Redesign

**Status:** Proposed  
**Date:** 2026-04-30  

---

## Background

Two separate problems motivated this design:

1. **Duplicate API calls.** `route.tsx` fetches a polyline and stores the result in local component state. When the user then clicks "Highlight Route" for the same destination, `useRouteCache` has no knowledge of that prior fetch and fires a second identical request to the Routes API.

2. **Unclear UX.** The drawer currently shows all history items as equal peers, each with "Set Route", "Highlight Route", and "Delete." There is no visual distinction between the route currently shown on the map and routes that are just in history.

---

## Goals

- One rendering path for all routes on the map (retire `route.tsx`)
- Eliminate the double-fetch on first highlight
- Live traffic (`TRAFFIC_AWARE`) reserved for the single active route only — it is a more expensive API request
- History drawer communicates clearly which destination is the active route
- Simple, predictable delete behavior

---

## Proposed Changes

### 1. Retire `route.tsx`, unify under `MultiRoutes`

`route.tsx` is deleted. All polyline rendering goes through the existing `MultiRoutes → RouteEntry → useRouteCache` pipeline.

`RouteEntry` gets a new `isPrimary` boolean prop. When `true` it:
- Passes `TRAFFIC_AWARE` routing options to `useRouteCache`
- Renders the info pill (travel time + distance) — currently lives in `route.tsx`

`MultiRoutes` derives `isPrimary` by comparing each `activeRoute.placeId` against `destination?.placeId` from context. No new state needed.

```
activeRoutes = [A, B, C]   destination = B

RouteEntry(A)  isPrimary=false  →  standard routing, no pill
RouteEntry(B)  isPrimary=true   →  TRAFFIC_AWARE, shows pill
RouteEntry(C)  isPrimary=false  →  standard routing, no pill
```

**Why not a flag on the route object?**  
`destination` in context already means "the active route" semantically. Adding `isPrimary: true` to route objects would duplicate that meaning and require `toggleActiveRoute` to sweep and demote the old primary on every "Set Route" click.

### 2. "Set Route" auto-adds to `activeRoutes`

Currently clicking "Set Route" calls `setDestination(dest)` but does not add the dest to `activeRoutes`, so `MultiRoutes` never renders it. The route only appeared because `route.tsx` had its own fetch-and-render loop.

With `route.tsx` gone, "Set Route" must:

```js
setDestination(dest)

// ensure the dest is visible on the map
if (!activeRoutes.some(r => r.placeId === dest.placeId)) {
  toggleActiveRoute(dest)
}
```

Consider wrapping these two calls in a single `setPrimaryRoute(dest)` context helper to avoid scattered call-site logic.

### 3. Promoting a highlighted route to active

If a user highlights route C and later promotes it to active via "Set as Active Route":

```js
setDestination(dest)   // makes C the active route (traffic-aware)
// C is already in activeRoutes, no toggleActiveRoute needed
// C was highlighted (standard) — it is now the primary (traffic-aware)
// no duplicate rendering because MultiRoutes renders each dest once
```

No removal from `activeRoutes` is needed. `RouteEntry` for C simply switches from standard to `TRAFFIC_AWARE` options because `isPrimary` flips to `true`.

### 4. Caching fix (byproduct of unification)

Because `useRouteCache` now handles every polyline (including the primary), the first "Highlight Route" click for a destination that is already the active route will be a cache hit — `routesCache.current[key]` was populated when "Set Route" was clicked.

---

## History Drawer Redesign

### Sort order

```
destHistory (sorted by insertion, i.e. last searched last):
  1. destination (active route) — pinned to top if set
  2. everything else in insertion order
```

The active route card floats to the top regardless of when it was searched.

### Active route card

| Element | Change |
|---|---|
| Visual treatment | Distinct styling (e.g. accent border or background tint) to signal it is the current route |
| "Set Route" button | Removed — it already is the active route |
| "Highlight Route" button | Removed — it is already displayed on the map |
| "Delete" button | Kept. Clears the active route (see Delete Behavior below) |

### History item card (non-active)

| Element | Change |
|---|---|
| "Set Route" label | Renamed to **"Set as Active Route"** (or "Set Active") |
| "Highlight Route" button | Kept — shows the route as a non-traffic overlay |
| "Delete" button | Kept |

When "Set as Active Route" is clicked on a history item that is currently highlighted, it becomes the primary (`isPrimary=true`) — its polyline switches to `TRAFFIC_AWARE` without a re-fetch if the standard polyline is already cached.

### Delete behavior

**Deleting the active route:**
- Calls `setDestination(null)` and `setRouteBounds(null)`
- Removes dest from `activeRoutes` (polyline disappears)
- Home/origin is unchanged
- The top "active route" slot disappears; drawer shows flat history list
- Nothing auto-promotes — user must explicitly set a new active route

**Deleting a non-active history item:**
- Existing behavior: removes from `destHistory` and `activeRoutes`
- If that item was highlighted, its polyline disappears from the map

---

## Data Model

No new context state is needed. All changes are derived from existing fields:

| Existing field | Role in new design |
|---|---|
| `destination` | The active route. Source of truth for which route gets `TRAFFIC_AWARE` and the info pill. |
| `activeRoutes` | All routes currently drawn on the map (includes the active route). |
| `destHistory` | All searched destinations. Drawer sorts this with active route first. |
| `routesCache` | Polyline cache shared across `useRouteCache` instances. Eliminates double-fetch. |

---

## Files Affected

| File | Change |
|---|---|
| `components/route.tsx` | **Deleted** |
| `components/MapView.jsx` | Remove `<Route>` import and render |
| `components/MultiRoutes.jsx` | Derive `isPrimary`, pass correct `routeOptions` and prop to `RouteEntry` |
| `components/RouteEntry.jsx` | Accept `isPrimary` prop, render info pill when true |
| `components/LocationCard.jsx` | Remove "Set Route" / "Highlight Route" from active card; rename button on history cards |
| `components/LocationDrawer.jsx` | Sort `destHistory` with active route first; pass `isActive` prop to `LocationCard` |
| `context/MapContext.js` | Add optional `setPrimaryRoute` helper; update `deleteFromHistory` to also clear `destination` if placeIds match |
| `hooks/useRouteCache.js` | Accept `routeOptions` so primary can pass `TRAFFIC_AWARE` |

---

## Open Questions

1. **Pinning the active route.** Can the user "unhighlight" (toggle off) the active route via its polyline, or is the primary always pinned visible? Current proposal: the active route is always shown — it has no toggle, only Delete.

2. **Info pill on primary.** The pill (travel time + distance) currently shows live traffic data from `route.tsx`. With `TRAFFIC_AWARE` routing in `useRouteCache`, the same data is available in `route.legs[0]`. Confirm the pill should move into `RouteEntry` behind `isPrimary`.

3. **"Set as Active Route" label.** Exact button copy TBD — options: "Set Active", "Set as Route", "Make Active".
