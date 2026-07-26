"use client";

// look into reducesrs https://react.dev/learn/scaling-up-with-reducer-and-context
import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { MAP_CONFIG } from '../config/maps';
import { useDestinations } from '../hooks/useDestinations';
import { defaultColors } from '../MapStyling/RouteColors';
import { useOriginMetrics } from '../hooks/useOriginMetrics';
import { usePlaceData } from '../hooks/usePlaceData';

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
 * @property {{Place.placeId: Place}}              homeHistory            - object keyed by placeId that holds home history
 * @property {(loc: Place) => void}                addHome                - sets home value + sets map center + adds to homeHistory
 * @property {(placeId:Place) => void}             deleteFromHomeHistory  - removes placeId from home history
 * @property {() => void}                          handleHomeClear        - clears home, destination, route bounds
 *
 * @property {Place|null}                          destination            - active route (Set Route target)
 * @property {(loc: Place|null) => void}           setDestination
 * @property {(loc: Place) => void}                addDestination         - sets destination + appends to destHistory if new
 * @property {() => void}                          clearRoute             - clears destination + route bounds, recenters on home
 *
 * @property {{Place.placeId:Place}}               destHistory            - object of all searched destinations keyed by destation id (drives drawer + table)
 * @property {(placeId: string) => void}           deleteFromDestHistory  - removes from destHistory + activeRoutes
 * @property {(history: Place[]) => void}          setDestHistory
 *
 * @property {Place.placeId: color}                activeRoutes           - destIds pointing at color from colors map
 * @property {{Place.placeId: true}}               activePins             - set-like object of pinned placeIds; membership check via `placeId in activePins`
 * 
 * @property {(loc: Place) => void}                toggleActiveRoute      - add/remove a route from the map
 * @property {(placeId: string) => void}           toggleActivePins       - add/remove a placeId from activePins
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
  const [activeRoutes, setActiveRoutes] = useState({});
  const [activePins, setActivePins] = useState({})

  // --- UI/Map Control State ---
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
  const [mapType, setMapType] = useState(true); // true = roadmap, false = hybrid
  const [historyType, setHistoryType] = useState("destination");

  // -- Highlight Route Colors pool
  const routeColorsPoolRef  = useRef([...defaultColors]);

  // -- data cache 
  const routesCache = useRef ({});
  const travelCache = useRef({
    places: {}, // { "placeId": placeData }
    routes: {}, // { "homeId": destId: { drive, walk, transit } }
  });

  // CUSTOM HOOKS AND EFFECTS 
  // pretend hook code is just brought over
  const { placeDataCounter } =  usePlaceData(homeHistory, destHistory, travelCache);
  const { syncingDestData } = useDestinations(home, destHistory, travelCache);
  const { syncingMetrics, originMetrics } = useOriginMetrics(destination?.placeId, homeHistory, destHistory, activeRoutes, travelCache);
  
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
  const deactivateRoute = (prev, placeId, notSafe = true) => {
    // not active skip 
    if (notSafe && !Object.hasOwn(prev, placeId)) return prev; 

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

  const deactivatePin = (prev, placeId, notSafe = true) => {
    // not active skip 
    if (notSafe && !Object.hasOwn(prev, placeId)) return prev; 
    // --- CASE: TURN OFF PIN ---
    const {[placeId]:_, ...rest} = prev;
    return rest;
  };


  const deleteFromHomeHistory = useCallback((placeId) => {
    setHomeHistory((prev) => {
      const { [placeId] : _, ...rest } = prev;
      return rest;
    })

    setActivePins((prev) => {
      return deactivatePin(prev, placeId);
    });

    setHome((prevHome) => (prevHome?.placeId === placeId ? null : prevHome));
  }, []);

  const deleteFromDestHistory = useCallback((placeId) => {
    setDestHistory((prev) => {
      const { [placeId] : _, ...rest } = prev;
      return rest;
    });

    setActiveRoutes((prev) => {
      return deactivateRoute(prev, placeId);
    });

    setDestination((prevDest) => (prevDest?.placeId === placeId ? null : prevDest));
  }, []);
  

  const toggleHistoryType = useCallback(() => {
    setHistoryType(prev => prev === 'destination' ? 'home' : 'destination');
  }, []);

  const toggleMapType = useCallback(() => {
    setMapType(prev => !prev);
  }, []);

  // LESSON LEARNED NEVER HAVE NESTED SETTERS
  const toggleActiveRoute = useCallback((destPlaceId) => {
    setActiveRoutes((prev) => {
      const isActive = Object.hasOwn(prev, destPlaceId);

      // --- CASE: TURN OFF ---
      if (isActive) {
        return deactivateRoute(prev, destPlaceId, false);
      }

      // --- CASE: TURN ON ---
      // Check if we actually have colors left in the pool
      if (routeColorsPoolRef.current.length === 0) {
        console.warn("Max routes reached: No colors available in the pool.");
        return prev;
      }

      return activateRoute(prev, destPlaceId);
    });
  }, []); // Dependencies: empty, because we use the functional update 'prev => ...'

  const toggleActivePins = useCallback((placeId, label) => {
    setActivePins((prev) => {
      const isActive = Object.hasOwn(prev, placeId);

      // --- CASE: TURN OFF ---
      if(isActive) {
        return deactivatePin(prev, placeId, false);
      } else {
      // --- CASE: TURN ON ---
        return {...prev, [placeId]:label};
      }
    })
  }, []);

  const clearAllCompares = useCallback(() => {
    routeColorsPoolRef.current = [...defaultColors];
    setActiveRoutes({});
  }, []);

  const clearAllPins = useCallback(() => {
    setActivePins({});
  }, []);

  const clearHistory = useCallback(() => {
    if (historyType === 'destination') {
      setDestHistory({});
      setDestination(null);

      // chosing to only remove active routes if destHistory is reset
      clearAllCompares();

    } else {
      setHomeHistory({});
      setHome(null);
      clearAllPins
    }
  }, [historyType]);



  const setMainRoute = useCallback((destObj) => {
    setActiveRoutes((prev) => {
      return deactivateRoute(prev, destObj.placeId);
    });

    setDestination(destObj);
  }, []);

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
    home, addHome, homeHistory, handleHomeClear,
    destination, setDestination, addDestination, deleteFromHomeHistory, clearRoute,
    destHistory, deleteFromDestHistory, setDestHistory,
    clearAllPins,
    clearAllCompares,
    clearHistory,
    routeBounds, setRouteBounds,
    routesCache,
    travelCache,
    activeRoutes, toggleActiveRoute,
    activePins, toggleActivePins,
    routeColorsPoolRef,
    mapCenter, setMapCenter,
    isStreetViewVisible, setIsStreetViewVisible,
    mapType, toggleMapType,
    historyType, toggleHistoryType,
    syncingDestData,
    syncingMetrics, originMetrics,
    placeDataCounter,
    setMainRoute,
  }), [
    home, addHome, homeHistory, handleHomeClear,
    destination, addDestination, deleteFromHomeHistory, clearRoute,
    destHistory, deleteFromDestHistory,
    clearAllPins,
    clearAllCompares,
    clearHistory,
    routeBounds,
    routesCache, 
    travelCache,
    activeRoutes,
    activePins,
    routeColorsPoolRef,
    mapCenter,
    isStreetViewVisible,
    mapType, toggleMapType,
    historyType, toggleHistoryType,
    syncingDestData,
    syncingMetrics, originMetrics,
    placeDataCounter,
    setMainRoute,
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

/**
 * Access global map/route state. See the `MapFeatures` typedef above for the full shape.
 * @returns {MapFeatures}
 */
export const useMapFeatures = () => useContext(MapContext);
