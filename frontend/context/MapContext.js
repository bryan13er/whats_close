"use client";

// look into reducesrs https://react.dev/learn/scaling-up-with-reducer-and-context
import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { MAP_CONFIG } from '../config/maps';
import { useDestinations } from '../hooks/useDestinations';
import { defaultColors } from '../MapStyling/RouteColors';

/**
 * @typedef {import('../types').Place} Place
 * @typedef {import('../types').Row} Row
 * @typedef {import('../types').GoogleRoute} GoogleRoute
 */

/**
 * @typedef {Object} MapFeatures
 * The full surface of state and actions exposed by `useMapFeatures()`.
 * Every component that calls the hook gets this object.
 *
 * @property {Place|null}                          home                   - origin / "where from"
 * @property {(loc: Place) => void}                handleHomeSelect       - sets home + recenters map
 * @property {() => void}                          handleHomeClear        - clears home, destination, route bounds
 *
 * @property {Place|null}                          destination            - active route (Set Route target)
 * @property {(loc: Place|null) => void}           setDestination
 * @property {(loc: Place) => void}                addDestination         - sets destination + appends to destHistory if new
 * @property {() => void}                          clearRoute             - clears destination + route bounds, recenters on home
 *
 * @property {Place.placeId:Place}                 destHistory            - object of all searched destinations keyed by destation id (drives drawer + table)
 * @property {(placeId: string) => void}           deleteFromHistory      - removes from destHistory + activeRoutes
 * @property {(history: Place[]) => void}          setDestHistory
 *
 * @property {Place.placeId:color}                 activeRoutes           - destIds pointing at color from colors map
 * @property {(loc: Place) => void}                toggleActiveRoute      - add/remove a route from the map
 *
 * @property {{north: number, south: number, east: number, west: number}|null} routeBounds
 * @property {(b: any) => void}                    setRouteBounds
 *
 * @property {React.MutableRefObject<Object<string, GoogleRoute>>} routesCache - polyline cache, key = `${homeId}_${destId}`
 *
 * @property {{lat: number, lng: number}}          mapCenter
 * @property {(c: {lat: number, lng: number}) => void} setMapCenter
 *
 * @property {boolean}                             isStreetViewVisible
 * @property {(v: boolean) => void}                setIsStreetViewVisible
 *
 * @property {boolean}                             mapType                - true = roadmap, false = hybrid
 * @property {() => void}                          toggleMapType
 *
 * @property {boolean}                             showDataTable
 * @property {(v: boolean) => void}                setShowDataTable
 *
 * @property {Row[]}                               rows                   - prepared data for table/cards (built by useDestinations)
 */

/** @type {React.Context<MapFeatures|null>} */
const MapContext = createContext(null);

export function MapFeatureProvider({ children }) {
  // --- Data State ---
  const [home, setHome] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destHistory, setDestHistory] = useState({});
  const [homeHistory, setHomeHistory] = useState({});
  const [routeBounds, setRouteBounds] = useState(null);
  const routesCache = useRef ({});
  const [activeRoutes, setActiveRoutes] = useState({});

  // --- UI/Map Control State ---
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
  const [mapType, setMapType] = useState(true); // true = roadmap, false = hybrid

  // -- Additonal Route Colors
  const routeColorsPoolRef  = useRef([...defaultColors]);
  
  // --- Logic Handlers (Memoized) ---
  const addHome = useCallback((location) => {
    setHome(location);

    setHomeHistory((prev) => {
      const isDuplicate = location.placeId in prev;
      return isDuplicate ? prev : {...prev, [location.placeId]:location};
    });

    setMapCenter({ lat: location.lat, lng: location.lng });
  }, []);

  const handleHomeClear = useCallback(() => {
    setHome(null);
    setDestination(null);
    setRouteBounds(null);
  }, []);

  const addDestination = useCallback((location) => {
    setDestination(location);
    // Functional update avoids needing destHistory in the dependency array
    setDestHistory((prev) => {
      const isDuplicate = location.placeId in prev;
      return isDuplicate ? prev : {...prev, [location.placeId]:location};
    });
  }, []);

  const clearRoute = useCallback(() => {
    setDestination(null);
    setRouteBounds(null);
    if (home) {
      // The "Look Back" snap
      setMapCenter({ lat: home.lat, lng: home.lng });
    }
  }, [home]);

  // pertain to setActiveRoute i.e. for multiRoute
  const deactivateRoute = (prev, placeId) => {
    const colorToRelease = prev[placeId];
    routeColorsPoolRef.current.push(colorToRelease);
    
    const { [placeId]: _, ...rest } = prev; // Omit the specific ID
    return rest;
  };

  const activateRoute = (prev, placeId) => {
    const colorToAssign = routeColorsPoolRef.current.pop();
    return { 
      ...prev, 
      [placeId]: colorToAssign 
    };
  }

  const deleteFromHistory = useCallback((placeId) => {
    setDestHistory((prev) => {
      const { [placeId] : _, ...rest } = prev;
      return rest;
    });

    setActiveRoutes((prev) => {
      return deactivateRoute(prev, placeId);
    });
  }, []);

  const toggleMapType = useCallback(() => {
    setMapType(prev => !prev);
  }, []);

  // LESSON LEARNED NEVER HAVE NESTED SETTERS
  const toggleActiveRoute = useCallback((dest) => {
    setActiveRoutes((prev) => {
      const isActive = Object.hasOwn(prev, dest.placeId);

      // --- CASE: TURN OFF ---
      if (isActive) {
        return deactivateRoute(prev, dest.placeId);
      }

      // --- CASE: TURN ON ---
      // Check if we actually have colors left in the pool
      if (routeColorsPoolRef.current.length === 0) {
        console.warn("Max routes reached: No colors available in the pool.");
        return prev;
      }

      return activateRoute(prev, dest.placeId);
    });
  }, []); // Dependencies: empty, because we use the functional update 'prev => ...'

  // rows holds the data that fills the datatable
  // I need it to persist even when the table is unmounted
  // so it needs to exist here
  // fetch the data with custom hook
  // basically pretend the code is getting
  // brought over 
  // ROWS DEFAUTL VALUE is []
  // MapFeatureProvider   ← useDestinations() called here, rows persist
  // └── DestInfoTable    ← just reads rows from context
  const { rows } = useDestinations(home, destHistory);


  // read about why in:
  // https://react.dev/reference/react/useCallback
  // https://react.dev/reference/react/memo
  // they work together to preven uneeded rerenders
  // the memo has to be here because of how I consume 
  // props through the provider
  // in summary:
  // for memo to work it needs to see the same props
  // if my hanlde functions get recreated after each render
  // the props will never be the same so useCallback allows
  // me to keep the same function reference 
  const value = useMemo(() => ({
    home, addHome, handleHomeClear,
    destination, setDestination, addDestination, clearRoute,
    destHistory, deleteFromHistory, setDestHistory,
    routeBounds, setRouteBounds,
    routesCache,
    activeRoutes, toggleActiveRoute,
    routeColorsPoolRef,
    mapCenter, setMapCenter,
    isStreetViewVisible, setIsStreetViewVisible,
    mapType, toggleMapType,
    rows
  }), [
    home, addHome, handleHomeClear,
    destination, addDestination, clearRoute,
    destHistory, deleteFromHistory,
    routeBounds,
    routesCache, 
    activeRoutes,
    routeColorsPoolRef,
    mapCenter,
    isStreetViewVisible,
    mapType,
    toggleMapType,
    rows
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

/**
 * Access global map/route state. See the `MapFeatures` typedef above for the full shape.
 * @returns {MapFeatures}
 */
export const useMapFeatures = () => useContext(MapContext);
