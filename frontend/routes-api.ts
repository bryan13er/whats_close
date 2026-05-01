/// <reference types="@types/google.maps" />
import { apiRequest } from './lib/apiRequest';

const fields = ['routes.viewport', 'routes.legs', 'routes.polylineDetails', 'routes.legs.duration', 'routes.legs.distanceMeters'];

// docs at https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes

const ROUTES_API_ENDPOINT =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

export class RoutesApi {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) throw new Error('RoutesApi: API key is required');
    this.apiKey = apiKey;
  }

  async computeRoutes(
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral,
    options: any,
    requestOptions?: { signal?: AbortSignal }
  ) {
    if (!from || !to) {
      throw new Error('RoutesApi.computeRoutes: origin and destination are required');
    }

    const routeRequest = {
      origin: {
        location: {latLng: {longitude: from.lng, latitude: from.lat}}
      },
      destination: {
        location: {latLng: {longitude: to.lng, latitude: to.lat}}
      },
      ...options
    };

    const url = new URL(ROUTES_API_ENDPOINT);
    url.searchParams.set('fields', fields.join(','));

    return apiRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
      },
      body: JSON.stringify(routeRequest),
      signal: requestOptions?.signal,
      label: 'Routes',
    });
  }
}
