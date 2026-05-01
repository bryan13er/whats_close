"use client";

// look into reducesrs https://react.dev/learn/scaling-up-with-reducer-and-context
import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { MAP_CONFIG } from '../config/maps';
import { useDestinations } from '../hooks/useDestinations';

/* Shape of 'home' / 'destination' objects:
  {
    field:   string, // 'origin' | 'destination'
    label:   string, // name of place, i.e. full address
    placeId: string, // 'ChIJ4-Rmg...'
    lat:     number, // 36.618...
    lng:     number  // -121.901...
  }
*/

const MapContext = createContext(null);

export function MapFeatureProvider({ children }) {
  // --- Data State ---
  const [home, setHome] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destHistory, setDestHistory] = useState([]);
  const [routeBounds, setRouteBounds] = useState(null);
  const routesCache = useRef ({});
  const [activeRoutes, setActiveRoutes] = useState([]);

  // --- UI/Map Control State ---
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.defaultCenter);
  const [isStreetViewVisible, setIsStreetViewVisible] = useState(false);
  const [mapType, setMapType] = useState(true); // true = roadmap, false = hybrid
  const [showDataTable, setShowDataTable] = useState(true)


  // --- Logic Handlers (Memoized) ---

  const handleHomeSelect = useCallback((location) => {
    setHome(location);
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
      const isDuplicate = prev.some((d) => d.placeId === location.placeId);
      return isDuplicate ? prev : [...prev, location];
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

  const deleteFromHistory = useCallback((placeId) => {
    setDestHistory((prev) => prev.filter(dest => dest.placeId !== placeId));

    setActiveRoutes((prev) =>
      prev.filter(route => route.placeId !== placeId)
    );
  }, []);

  const toggleMapType = useCallback(() => {
    setMapType(prev => !prev);
  }, []);

  const toggleActiveRoute = useCallback((dest) => {
    setActiveRoutes((prev) => {
      // 1. Check if it's already there
      const isAlreadyActive = prev.some(route => route.placeId === dest.placeId);
  
      if (isAlreadyActive) {
        // 2. It's a duplicate? Remove it (Toggle OFF)
        return prev.filter(route => route.placeId !== dest.placeId);
      } 
      
      // 3. Not there? Add it (Toggle ON)
      return [...prev, dest];
    });
  }, []);

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
    home, handleHomeSelect, handleHomeClear,
    destination, setDestination, addDestination, clearRoute,
    destHistory, deleteFromHistory, setDestHistory,
    routeBounds, setRouteBounds,
    routesCache,
    activeRoutes, toggleActiveRoute,
    mapCenter, setMapCenter,
    isStreetViewVisible, setIsStreetViewVisible,
    mapType, toggleMapType,
    showDataTable, setShowDataTable,
    rows
  }), [
    home, handleHomeSelect, handleHomeClear,
    destination, addDestination, clearRoute,
    destHistory, deleteFromHistory,
    routeBounds,
    routesCache, 
    activeRoutes,
    mapCenter,
    isStreetViewVisible,
    mapType,
    showDataTable,
    toggleMapType,
    rows
  ]);

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export const useMapFeatures = () => useContext(MapContext);
