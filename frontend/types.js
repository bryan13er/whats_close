/**
 * Shared type definitions. Reference these from other files via:
 *   /** @typedef {import('../types').Place} Place * /
 *
 * Centralized so the same shape isn't redefined in multiple files. If a shape
 * changes (e.g., Place gets a new field), update it here and every consumer
 * picks it up automatically in their editor's IntelliSense.
 */

/**
 * @typedef {Object} Place
 * A single location selected from autocomplete + geocoded.
 * Used as `home`, `destination`, items in `destHistory`, and items in `activeRoutes`.
 *
 * @property {'origin'|'dest'} field             - which input the user typed it into
 * @property {string} label                       - "Chipotle Mexican Grill, Munras Avenue, Monterey, CA, USA"
 * @property {string} placeId                     - "ChIJl28xQCTkjYAR48CoQtJ6pb4"
 * @property {number} lat                         - 36.5969267
 * @property {number} lng                         - -121.8944817
 */

/**
 * @typedef {Object} Row
 * Prepared row of data for display in the table and cards.
 * Built by `prepRowData()` in `utils/places.js` from a Place + matrix data + place details.
 *
 * @property {string} name                        - "Chipotle Mexican Grill, Munras Avenue, Monterey, CA, USA"
 * @property {string} desPlaceId                  - "ChIJl28xQCTkjYAR48CoQtJ6pb4"
 * @property {Place} destObj                      - the original Place this row was built from
 * @property {number} distance                    - meters from origin (e.g. 30353)
 * @property {number|null} driveTime              - seconds, null if ROUTE_NOT_FOUND
 * @property {number|null} walkTime               - seconds, null if ROUTE_NOT_FOUND
 * @property {number|null} transitTime            - seconds, null if ROUTE_NOT_FOUND
 * @property {number|'N/A'} ratings               - 0-5 from Places API, or 'N/A' if missing
 * @property {string} cost                        - "$" | "$$" | "$$$" | "$$$$" | "$0" | "N/A"
 */

/**
 * @typedef {Object} MatrixCell
 * One cell of a Routes Matrix API response.
 * Note: `duration` is a string like "419s" — use `cleanTimeRes()` to convert to seconds.
 *
 * @property {number} originIndex
 * @property {number} destinationIndex
 * @property {string} duration                    - "419s"
 * @property {number} distanceMeters
 * @property {string} [condition]                 - "ROUTE_NOT_FOUND" when no path exists
 */

/**
 * @typedef {Object} PlaceDetails
 * Subset of the Places API v1 response that we read.
 *
 * @property {number} [rating]                    - 0-5
 * @property {string} [priceLevel]                - "PRICE_LEVEL_INEXPENSIVE" etc., mapped via priceMap
 * @property {string} [id]                        - placeId
 * @property {Object} [regularOpeningHours]
 */

/**
 * @typedef {Object} GoogleRoute
 * One route from the Routes API. Contains polyline-bearing legs and steps.
 *
 * @property {Object[]} legs                      - usually length 1 (no waypoints)
 * @property {Object} viewport                    - bounding box for the route
 * @property {{high: {latitude: number, longitude: number}}} viewport
 * @property {{low: {latitude: number, longitude: number}}}  viewport
 */

/**
 * @typedef {Object} CachedRoutes
 * Shape of `routesCache.current[`${homeId}_${destId}`]` — the polyline cache.
 * @property {GoogleRoute} route
 */

/**
 * @typedef {Object} RouteOptions
 * Options passed to the Routes API. Most importantly, `travelMode` and (eventually)
 * `routingPreference: 'TRAFFIC_AWARE'` for the primary route.
 *
 * @property {'DRIVE'|'WALK'|'BICYCLE'|'TWO_WHEELER'|'TRANSIT'} travelMode
 * @property {string} [routingPreference]         - "TRAFFIC_AWARE" | "TRAFFIC_AWARE_OPTIMAL"
 */

// Make this file a module so @typedef can be referenced via `import('../types')`.
export {};
