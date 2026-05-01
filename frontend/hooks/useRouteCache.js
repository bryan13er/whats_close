import { useState, useEffect } from 'react';
import { routesApiClient } from '../config/maps';
import { useMapFeatures } from '../context/MapContext';
import { logError } from '../lib/logger';

async function fetchMissingRoute(home, dest, routeOptions, signal) {
  const res = await routesApiClient.computeRoutes(home, dest, routeOptions, { signal });

  // Empty `routes` array means Google found no path — this is not an error,
  // just an unservable request (e.g. transit between disconnected regions)
  if (!res.routes || res.routes.length === 0) {
    console.warn("No routes found for:", dest.placeId);
    return null;
  }

  const [route] = res.routes;
  return route;
}

export function useRouteCache(destination, routeOptions) {
  const { home, routesCache } = useMapFeatures();
  const [route, setRoute] = useState(null);

  useEffect(() => {
    if (!home || !destination) return;

    const routeKey = `${home.placeId}_${destination.placeId}`;
    const cachedRoute = routesCache.current[routeKey];

    if (cachedRoute) {
      setRoute(cachedRoute);
      return;
    }

    // Abort any in-flight request if home / destination / options change before it resolves
    const controller = new AbortController();

    fetchMissingRoute(home, destination, routeOptions, controller.signal)
      .then(fetchedRoute => {
        if (controller.signal.aborted || !fetchedRoute) return;
        routesCache.current[routeKey] = fetchedRoute;
        setRoute(fetchedRoute);
      })
      .catch(err => {
        if (controller.signal.aborted || err?.name === 'AbortError') return;
        logError(err, {
          hook: 'useRouteCache',
          homeId: home?.placeId,
          destId: destination?.placeId,
        });
      });

    return () => {
      controller.abort();
    };
  }, [home, destination, routeOptions, routesCache])

  return { route };
}
