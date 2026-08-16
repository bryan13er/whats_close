# Route Color Pool

**Status:** Proposed
**Date:** 2026-05-01

---

## Problem

When the user highlights multiple routes on the map, each polyline needs a distinct color so the routes are visually distinguishable. The current `RouteEntry.jsx` picks a color by array index (`defaultColors[routeIndex]`), but this has two problems:

1. **Colors shift when routes are removed.** If three routes are highlighted (red, green, amber) and the user unhighlights the red one, the green route shifts into the red slot and the amber route becomes green. Visually jarring — colors should be stable per route.

2. **Capacity is implicit.** The palette has nine colors. The 10th highlighted route gets `defaultColors[9]` which is `undefined`, and the polyline silently renders with whatever default Google Maps falls back to.

We want each route's color to stay the same for the lifetime of its highlight, and the palette to be explicitly capped.

---

## Goals

- Each route has a stable color from the moment it is highlighted until it is unhighlighted or deleted.
- Colors are released back to the pool when a route is unhighlighted or deleted.
- The palette is capped at 9 simultaneous highlighted routes; the 10th request is rejected, not silently broken.
- The active route ("Set Route") is excluded from this pool — it has its own color (or is filled by `route.tsx` for now, eventually traffic-aware orange per the unification doc).
- `RouteEntry` reads its color by `placeId` lookup. No `index` prop threading.

---

## Non-goals

- Animations or transitions when a color is assigned/released.
- Color preferences per route (the user can't "pin" a specific color to a destination).
- Persistence across sessions (refresh resets the pool, which is fine — `activeRoutes` resets too).

---

## Design

### Data model

Two pieces of state in `MapContext`:

```js
const [activeRoutes, setActiveRoutes] = useState([]);
const [routeColors, setRouteColors] = useState({}); // { placeId: '#FF5C35' }
```

`routeColors` is the source of truth for assignments. Available colors are derived:

```js
const used = new Set(Object.values(routeColors));
const available = defaultColors.find(c => !used.has(c));
```

No separate "queue" data structure. The map of assignments and the palette together fully describe pool state — a separate queue would just be a second copy of the same information that can drift out of sync.

### Palette source

Already exists at `frontend/MapStyling/RouteColors.js`. Needs to be exported:

```js
export const defaultColors = [
  "#FF5C35",
  "#22C55E",
  "#F59E0B",
  "#8B5CF6",
  "#06B6D4",
  "#EF4444",
  "#14B8A6",
  "#64748B",
  "#F97316",
];
```

### Allocation: extend `toggleActiveRoute`

The same context method that adds/removes from `activeRoutes` also assigns/releases colors. Atomic — there's never a moment where a route is in `activeRoutes` without a color, or vice versa.

```js
const toggleActiveRoute = useCallback((dest) => {
  const isActive = activeRoutes.some(r => r.placeId === dest.placeId);

  if (isActive) {
    // toggling OFF — remove from both
    setActiveRoutes(prev => prev.filter(r => r.placeId !== dest.placeId));
    setRouteColors(prev => {
      const { [dest.placeId]: _, ...rest } = prev;
      return rest;
    });
    return true; // success
  }

  // toggling ON — find first unused color
  const used = new Set(Object.values(routeColors));
  const next = defaultColors.find(c => !used.has(c));

  if (!next) {
    return false; // pool exhausted, caller decides what to do
  }

  setActiveRoutes(prev => [...prev, dest]);
  setRouteColors(prev => ({ ...prev, [dest.placeId]: next }));
  return true;
}, [activeRoutes, routeColors]);
```

> **Why return a boolean?** It tells the caller whether the toggle succeeded so the UI can react (e.g., flash a toast). Optional — could also return void and let the UI compute capacity itself from `activeRoutes.length`.

### Cleanup on delete

`deleteFromHistory` already removes from `activeRoutes`. It needs to also clear `routeColors`:

```js
const deleteFromHistory = useCallback((placeId) => {
  setDestHistory(prev => prev.filter(d => d.placeId !== placeId));
  setActiveRoutes(prev => prev.filter(r => r.placeId !== placeId));
  setRouteColors(prev => {
    const { [placeId]: _, ...rest } = prev;
    return rest;
  });
}, []);
```

### Consumption: `RouteEntry` reads by `placeId`

```jsx
import { useMapFeatures } from '../context/MapContext';

export default function RouteEntry({ destination, routeOptions }) {
  const { home, routeColors } = useMapFeatures();
  const { route } = useRouteCache(destination, routeOptions);

  if (!route) return null;

  const myColor = routeColors[destination.placeId] ?? '#888'; // gray fallback if no assignment
  // ... use myColor for polylines
}
```

`MultiRoutes` no longer needs to pass `index`:

```jsx
return activeRoutes.map(dest => (
  <RouteEntry
    key={dest.placeId}
    destination={dest}
    routeOptions={routeOptions}
  />
));
```

### UI feedback: disable "Highlight Route" at capacity

`LocationCard` already has access to `activeRoutes` from context. Disable the button when the pool is full and the card isn't already active:

```jsx
const isMine = activeRoutes.some(r => r.placeId === place.destObj.placeId);
const poolFull = activeRoutes.length >= defaultColors.length;
const disabled = !isMine && poolFull;

<button
  className={`btn-highlight-route${isMine ? ' btn-highlight-route--active' : ''}`}
  disabled={disabled}
  title={disabled ? 'Max 9 routes — unhighlight one to add another' : undefined}
  onClick={() => toggleActiveRoute(place.destObj)}
>
  {isMine ? 'Hide Route' : 'Highlight Route'}
</button>
```

The `title` doubles as a native tooltip explaining *why* the button is disabled. Add a CSS rule for `.btn-highlight-route:disabled` so the visual state is obvious.

---

## Edge cases

| Case | Behavior |
|---|---|
| Highlight 10th route | `toggleActiveRoute` returns `false`, no state change. Button was already disabled at the UI layer. |
| Unhighlight, then highlight a new route | The released color goes back into the pool. Whether the *new* route gets that exact color depends on `Array.find` order — first unused color in the original palette order. So the most recently released color is reassigned first if it's the lowest-index unused color, otherwise the original lowest-index color is preferred. Predictable but not strictly FIFO. |
| Delete an active route from history | `deleteFromHistory` removes from all three: `destHistory`, `activeRoutes`, `routeColors`. |
| `routeColors[placeId]` is undefined in `RouteEntry` | Race condition between renders — `activeRoutes` updated but `routeColors` not yet. Fall back to `'#888'` gray. The next render will have the correct color. |
| User is the active route AND highlighted | Once `route.tsx` is retired (per `route-unification.md`), the active route lives in `activeRoutes` too but is rendered with a special color (traffic-aware orange). Color pool excludes the active route's `placeId` from assignment — handled at allocation time by checking `if (dest.placeId === destination?.placeId) skip pool`. |

---

## Alternatives considered

| Approach | Why not |
|---|---|
| **Index-based** (`colors[i]`) | Removing a route shuffles colors of every later route. Visually jarring. (This is what we have now.) |
| **Hash-based** (`colors[hash(placeId) % 9]`) | Two routes can collide on the same color and there's nothing you can do — defeats the "distinct" requirement. |
| **LRU eviction** (kick oldest assignment when pool empty) | The oldest highlighted route silently changes color when a 10th route is highlighted. Surprising and bad UX. |
| **Separate queue + map** (literal queue of available colors plus map of assignments) | Two data structures storing the same information. Easy for them to drift out of sync after a bug. |
| **`useReducer`** for `{ activeRoutes, routeColors }` together | Cleaner atomic updates, but more boilerplate. Could refactor to this later if the toggle logic grows. |

---

## Open questions

1. **Pool order.** When a color is released and then the user highlights a new route, should the newly available color be reassigned first (LIFO), or should the original palette order win (the design above)? Affects which color the user sees on a re-highlight.

2. **Active route's color.** Per the route-unification doc, the active route gets traffic-aware routing and a distinct color. Does it use a 10th reserved color, or pull from the same palette and exclude that color from highlighted-route assignments?

3. **Capacity feedback.** Tooltip is the lightest option. Do we want anything more (toast, inline message in the drawer header)?

---

## Files affected

| File | Change |
|---|---|
| `MapStyling/RouteColors.js` | Add `export` keyword |
| `context/MapContext.js` | Add `routeColors` state, update `toggleActiveRoute` and `deleteFromHistory`, expose `routeColors` in context value |
| `components/RouteEntry.jsx` | Read color by `placeId` from context, drop the `index` prop |
| `components/MultiRoutes.jsx` | Stop passing `index` |
| `components/LocationCard.jsx` | Disable "Highlight Route" button when pool is full |
| `components/LocationCard.css` | `.btn-highlight-route:disabled` style |

---

## Implementation order (suggested)

1. Export `defaultColors` from `RouteColors.js`.
2. Add `routeColors` state and update `toggleActiveRoute` in `MapContext`. Add `routeColors` to the context value.
3. Update `deleteFromHistory` to clear color.
4. Update `RouteEntry` to read color from context. Drop `index` prop.
5. Update `MultiRoutes` to stop passing `index`.
6. Add disabled state to "Highlight Route" button in `LocationCard`.
7. Manual test: highlight 1, 2, 9 routes, unhighlight middle one, highlight a 10th (should be blocked), delete an active route.

Each step is small enough to commit and verify on its own.
