# Code Audit — What's Close

A walkthrough of issues, smells, and refactoring opportunities found during a sweep of the codebase. Prioritized so you can pick what to attack first.

Legend: 🔴 worth fixing soon · 🟡 worth thinking about · ⚪ nitpick

---

## Correctness / behavior

### 🔴 NavPill bypasses the centralized `PlacesAPI` client

`frontend/components/NavPill.jsx:7`
```js
const places = new PlacesAPI(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY);
```

This instantiates a brand-new client at module load instead of importing the shared one. Three consequences:

1. The fail-fast env validation in `config/maps.js` doesn't apply here — if the key is missing this just creates a broken client silently.
2. If the key system ever changes (e.g., adding a header, a base URL, a wrapper), you have two places to update.
3. The dev-time hot-reload picks up changes inconsistently.

**Fix:** Export an `autocompletePlacesApi` (or rename to consolidate, see refactor below) from `config/maps.js` and import it.

### 🔴 NavPill silently swallows autocomplete errors

`frontend/components/NavPill.jsx:207-209`
```js
} catch {
  if (requestId === requestSeq.current) setSuggestions([]);
}
```

No `logError`, no record of why suggestions disappeared. A 403 (key not authorized for Places API) looks identical to a network blip looks identical to "no results."

**Fix:** Pass the error through `logError(err, { hook: 'NavPill.autocomplete', input })`. Once the foundation branch is merged, it'll be a structured `[API ERROR]` log with status / googleMessage.

### 🔴 `getGeocodeV3` reads a separate env var that's never validated

`frontend/lib/AutoCompleteAPI.js:65`
```js
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY
```

The fail-fast validation in `config/maps.js` doesn't cover this. If the var is missing, you get a 400 from Google with no clear message. The foundation branch's `apiRequest` will at least surface Google's error nicely, but the variable itself is unchecked at startup.

**Fix:** Either add it to the `requireEnv` block in `config/maps.js`, or check at call time and throw with the same actionable message.

### 🔴 `layout.jsx` puts a non-`<head>`/`<body>` element between `<html>` and `<body>`

`frontend/app/layout.jsx:18-23`
```jsx
<html lang="en" className={inter.variable}>
  <StyledEngineProvider injectFirst>
    <body className={inter.className}>{children}</body>
  </StyledEngineProvider>
</html>
```

This is invalid HTML — only `<head>` and `<body>` are valid children of `<html>`. Next.js / React may render this as a fragment, but linters and validators flag it and behavior across versions is fragile.

**Fix:** Move `StyledEngineProvider` inside the `<body>`:
```jsx
<html lang="en" className={inter.variable}>
  <body className={inter.className}>
    <StyledEngineProvider injectFirst>{children}</StyledEngineProvider>
  </body>
</html>
```

### 🔴 `userScalable: false` is an accessibility blocker

`frontend/app/layout.jsx:30-31`

Disabling pinch-zoom prevents low-vision users from reading the app. Most maps apps actually need user zoom for the map UI itself. Drop this unless there's a specific reason to keep it.

### 🟡 `setRoute(cachedRoute)` synchronously inside `useEffect`

`frontend/hooks/useRouteCache.js:36-39`
```js
if (cachedRoute){
  setRoute(cachedRoute);
  return;
}
```

ESLint's `react-hooks/set-state-in-effect` flags this — it triggers a cascading render every time the effect runs.

**Fix options:**
- Use a lazy initializer + a derived check: `const [route, setRoute] = useState(() => routesCache.current[key] ?? null);` — but that runs once and won't re-read on key change.
- Compute `route` directly in render from `routesCache.current[key]`, fall back to a lazy-fetched piece of state for misses. Renders are cheap in React; reading a ref in render is fine.
- Or just accept the cascade — it's one extra render per cache hit.

### 🟡 `MapContext.useMemo` missing dep `toggleActiveRoute`

`frontend/context/MapContext.js:129`

ESLint warns about a missing dep. Doesn't currently bite because the function is `useCallback`'d with no deps, but the lint rule exists for a reason and someone could change `toggleActiveRoute` later.

**Fix:** Add it to the deps array (or destructure all callbacks into a single object that's memoized).

### 🟡 `tableStateBeforeOverlay` is in NavPill but its comment claims it was deleted

`frontend/components/NavPill.jsx:158-161`

```js
const tableStateBeforeOverlay = useRef(null);
// SIMPLIFIED: Kept pillRef (for click-outside), timer, and requestSeq.
// Deleted inputRefs, mobileInputRef, and tableStateBeforeOverlay!
```

The comment is wrong — `tableStateBeforeOverlay` is still declared and used at lines 226, 238. Either remove the ref or fix the comment.

### 🟡 Geolocation effect has empty deps + no cleanup

`frontend/components/MapView.jsx:49-59`

`navigator.geolocation.getCurrentPosition` is fire-and-forget. If the user navigates away before it resolves, `setMapCenter` runs on an unmounted provider. React 19 won't crash but warnings and stale state writes are possible.

**Fix:** Track an `isMounted` flag or use `AbortController` (newer geolocation APIs accept signals).

### ⚪ `useRef` imported but unused

`frontend/hooks/useRouteCache.js:1`

Lint warning, harmless. Drop it.

---

## Architecture / refactoring

### 🟡 Two `PlacesApi` classes named almost the same

| File | Class | Methods |
|---|---|---|
| `frontend/place-api.js` | `PlacesApi` | `getPlaceDetails` |
| `frontend/lib/AutoCompleteAPI.js` | `PlacesAPI` | `autocomplete`, `getGeocodeV4`, `getGeocodeV3` |

The names differ only by capitalization. Easy to misimport. They also overlap in scope (both wrap the Places v1 API).

**Refactor option A — merge into one client:**
```js
// frontend/lib/places.js
export class PlacesClient {
  autocomplete(input, opts) { ... }
  getDetails(placeId, fieldMask, opts) { ... }
  geocodeV4(placeId, opts) { ... }
  geocodeV3(placeId, opts) { ... }   // separate env var inside
}
```
Then `config/maps.js` exports a single `placesClient`. Cleaner imports, single source of truth, easier to add e.g. `searchText`, `nearby`, etc.

**Refactor option B — keep separate but rename:**
- `PlaceDetailsClient` (place details)
- `PlacesAutocompleteClient` (autocomplete + geocode)

Option A is more cohesive; Option B is a smaller diff.

### 🟡 `routes-api.ts` is the only TypeScript file in the codebase

Mixing one TS file into an otherwise JS project means you carry a `tsconfig`, build cost, and `@types/google.maps` dep for marginal benefit. Either:

- **Convert to JS** with JSDoc types — matches the rest of the codebase, the `@types/google.maps` types still help via `@type {...}` comments.
- **Convert the codebase to TS** — bigger lift, but TS would catch a lot of issues (place shape, route shape, event payload shapes).

Pick a direction; the current state is the worst of both worlds.

### 🟡 `LocationCard` declares `StarRow` inside the component body

`frontend/components/LocationCard.jsx:56-65`

Inline component definition means a new component identity on every render. React reconciler treats it as a different component each time — defeats `React.memo`, breaks state continuity if it ever held state.

**Fix:** Move `StarRow` to module scope (just outside the default export). One-line move.

### 🟡 `prepRowData` crashes if matrix data is missing

`frontend/utils/places.js:43`

```js
distance: driveData.distanceMeters
```

Reads `driveData.distanceMeters` directly. If `driveData` is `undefined` (e.g., matrix API returned partial results, or a `ROUTE_NOT_FOUND` for that destinationIndex without a fallback object), this throws.

**Fix:** Optional chaining + sensible fallbacks:
```js
distance: driveData?.distanceMeters ?? null,
driveTime: cleanTimeRes(driveData),  // already null-safe
```

### 🟡 `createDataLookup` keys by `destinationIndex` and the consumer uses array index

`frontend/hooks/useDestinations.js:42-46`
```js
missingDests.forEach((dest, index) => {
  cacheRef.current.routes[`${homeId}_${dest.placeId}`] = {
    drive: driveLookUp[index],
    walk: walkLookUp[index],
    transit: transitLookUp[index]
  };
});
```

The lookup is keyed by `destinationIndex` (which the API returns), and the loop reads it by the *iteration* `index`. These usually align (you sent destinations in this order, the API echoes the index), but if the API ever returns fewer rows than requested or sparse indices, the alignment silently breaks.

**Fix:** Be explicit — assign each result by the destinationIndex it carries, then assemble per `missingDests`:
```js
missingDests.forEach((dest, index) => {
  cacheRef.current.routes[`${homeId}_${dest.placeId}`] = {
    drive: driveLookUp[index] ?? null,
    walk: walkLookUp[index] ?? null,
    transit: transitLookUp[index] ?? null,
  };
});
```
Or, even better, iterate `Object.entries(driveLookUp)` and look up the matching dest.

### 🟡 `MapContext` `value` object is one big bag

`frontend/context/MapContext.js:117-128`

Every consumer subscribes to all of context. A re-render of any field causes every `useMapFeatures()` consumer to re-render. The `useMemo` keeps the *reference* stable but doesn't slice the surface.

**Refactor option:** Split into multiple contexts:
- `OriginContext` — `home`, `handleHomeSelect`, `handleHomeClear`
- `DestinationsContext` — `destination`, `addDestination`, `destHistory`, `deleteFromHistory`
- `MapViewContext` — `mapCenter`, `mapType`, `isStreetViewVisible`, `showDataTable`
- `RoutesContext` — `activeRoutes`, `toggleActiveRoute`, `routesCache`, `routeBounds`

Or bite the bullet and bring in [Zustand](https://zustand.docs.pmnd.rs/) — single store with selector-based subscriptions, no re-render unless your selected slice changed. Solves this problem out of the box.

This isn't urgent — performance is fine today. But it's the kind of choice that gets harder the longer you wait.

### 🟡 `useDestinations` cache and `routesCache` could be unified

They use the same key shape (`${homeId}_${destId}`) and live for the same lifetime. They're separate today because they hold different data, but a single typed cache:

```js
const cache = useRef({
  places: {},          // placeId → place details
  matrix: {},          // ${homeId}_${destId} → { drive, walk, transit }
  polyline: {},        // ${homeId}_${destId} → full route
});
```

…would make eviction logic uniform, simplify "cache garbage collection" when you add it, and reduce the number of refs threaded through hooks.

### 🟡 Console.log statements scattered through hot paths

- `MapView.jsx:37` — `console.log("🛠️ MapView Rendered")`
- `LocationCard.jsx:53` — `console.log(place)`
- `DestInfoTable.jsx:81` — `console.log("ROWS", rows)`
- `useDestinations.js:21,49,117` — fetched-data logs
- `AutoCompleteAPI.js:78` — geocode raw response
- `NavPill.jsx:260` — selected place

These are debugging noise in production. Either remove or gate behind `process.env.NODE_ENV === 'development'` or a `DEBUG` flag.

### ⚪ `lucide-react@^1.7.0` looks ancient

`frontend/package.json:19`

Lucide is currently at `^0.475.0` (or whatever the latest is) — `^1.7.0` looks like a typo or a stale lock. Worth `npm outdated` check and a bump.

### ⚪ `@react-google-maps/api` is unused

`frontend/package.json:17`

No imports anywhere. Drop it.

### ⚪ Backend has unused deps

`backend/package.json` — `axios` and `dotenv` are listed but `server.js` only uses `express`, `cors`, and `dotenv` (require'd but never reads any env). Trim or actually use them.

### ⚪ Backend `/test` route serves nothing real

If the backend isn't going to do work soon, consider deleting it from the monorepo entirely. Carrying a dead Express app pulls 20+ deps, slows installs, and confuses readers.

### ⚪ `Notes.md` at repo root

It's a fine scratchpad but is the kind of thing that ages badly. Either move it under `docs/notes/` for context with a date, or commit its contents as proper TODO entries and delete it.

---

## Refactor candidates by file (quick summary)

| File | Main suggestion |
|---|---|
| `MapContext.js` | Split into multiple contexts (or migrate to Zustand) |
| `LocationCard.jsx` | Lift `StarRow` to module scope; consider deriving `isActive` once |
| `NavPill.jsx` | Use shared `places` client from `config/maps.js`; clean stale comments |
| `useDestinations.js` | Unify the two caches into one ref; null-safe matrix indexing |
| `useRouteCache.js` | Read cache in render to avoid `setState`-in-effect |
| `place-api.js` + `lib/AutoCompleteAPI.js` | Merge into one `PlacesClient` |
| `routes-api.ts` | Convert to `.js` with JSDoc to match codebase, OR migrate everything to TS |
| `app/layout.jsx` | Move `StyledEngineProvider` inside `<body>`; drop `userScalable: false` |
| `route.tsx` | Retire per `docs/route-unification.md` |

---

## Things this audit did *not* check

- **Bundle size** — no analyzer run. MUI 7 + lucide-react + Google SDK is a hefty stack.
- **Performance profiling** — context re-render impact is theoretical until measured with React DevTools.
- **Lighthouse / a11y full scan** — only spotted the obvious ones.
- **Security** — API key exposure is inherent to client-side Google APIs and is mitigated by referrer restrictions in Google Cloud Console. Verify those are set.

---

## Recommended next moves (rough order)

1. Land the two open PRs (`feature/api-error-foundation`, `feature/consumer-error-handling`) so all error work is on `main`.
2. Fix `layout.jsx` (HTML correctness + a11y).
3. Replace NavPill's local `PlacesAPI` instance with a shared one + add `logError` calls.
4. Add `NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY` to fail-fast validation.
5. Pick a direction on `route.tsx` retirement (the design doc).
6. Remove dead deps + console.logs.
7. Decide on the `PlacesApi`/`PlacesAPI` merge.
8. Tackle context splitting *if and when* perf calls for it.
