import { useState, useEffect, useRef } from 'react';
import { createDataLookup, prepRowData } from '../utils/places';
import { routesMatrixApi, placesApi } from '../config/maps';

// Helper function extracted to keep the useEffect clean
async function fetchDestinationsData(homeOrigin, destsArray) {
  const [driveRes, walkRes, transitRes, placesRes] = await Promise.all([
    //computeMatrix can take multiple dests as an arg
    routesMatrixApi.computeMatrix(homeOrigin, destsArray, "DRIVE"),
    routesMatrixApi.computeMatrix(homeOrigin, destsArray, "WALK"),
    routesMatrixApi.computeMatrix(homeOrigin, destsArray, "TRANSIT"),
    //getDetails has to take each dest one by one
    Promise.all(destsArray.map(dest => placesApi.getPlaceDetails(dest.placeId)))
  ]);
  const driveResLookUp   = createDataLookup(driveRes);
  const walkResLookUp    = createDataLookup(walkRes);
  const transitResLookUp = createDataLookup(transitRes);
  return destsArray.map((dest, index) => {
    return prepRowData(dest, driveResLookUp[index], walkResLookUp[index], transitResLookUp[index], placesRes[index]);
  });
}

export function useDestinations(home, destinations) {
  const [rows, setRows] = useState([]);

  // Initialized to null so the first run always sees a change and does a full fetch
  const prevHome = useRef(null);
  const prevDests = useRef(null);

  useEffect(() => {
    let isMounted = true; // Prevents stale state updates if component unmounts during fetch

    const loadTableData = async () => {
      try {
        // Handle empty states immediately
        if (!home || destinations.length === 0) {
          if (isMounted) setRows([]);
          prevHome.current = home;
          prevDests.current = destinations;
          return;
        }

        const homeChanged = prevHome.current?.placeId !== home?.placeId;
        const currentIds = destinations.map(d => d.placeId);
        const prevIds = (prevDests.current || []).map(d => d.placeId);

        // SCENARIO 1: Home changed (or initial load) -> Refetch ALL
        if (homeChanged || prevIds.length === 0) {
          const newRows = await fetchDestinationsData(home, destinations);
          console.log("HOME CHANGED REFETCH ALL", newRows);
          if (isMounted) setRows(newRows);
        }
        // SCENARIO 2 & 3: Home is the same, diff the destinations
        else {
          const addedDests = destinations.filter(d => !prevIds.includes(d.placeId));
          const removedIds = prevIds.filter(id => !currentIds.includes(id));

          // SCENARIO 3: Only deletions -> No fetch, just filter local state
          if (removedIds.length > 0 && addedDests.length === 0) {
            if (isMounted) {
              console.log("NO FETCH DELETE ONLY")
              setRows(prevRows => prevRows.filter(row => !removedIds.includes(row.desPlaceId)));
            }
          }
          // SCENARIO 2: Additions -> Fetch ONLY new, append to local state
          else if (addedDests.length > 0) {
            const newRowsData = await fetchDestinationsData(home, addedDests);
            console.log("SAME HOME NEW DEST", newRowsData);
            if (isMounted) {
              setRows(prevRows => {
                // Filter out any deleted ones just in case both happened, then append new
                const filteredRows = prevRows.filter(row => !removedIds.includes(row.desPlaceId));
                return [...filteredRows, ...newRowsData];
              });
            }
          }
        }

        // Sync the refs with the current state for the next render cycle
        prevHome.current = home;
        prevDests.current = destinations;
      } catch (err) {
        console.error("Destination initialization failed:", err);
      }
    };

    loadTableData();

    // Cleanup function — isMounted prevents stale setRows calls from resolved fetches
    return () => {
      isMounted = false;
    };
  }, [home, destinations]);

  return { rows };
}