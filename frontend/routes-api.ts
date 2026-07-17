/// <reference types="@types/google.maps" />
// TODO: after testing delete this moved to using Field Mask
// const fields = ['routes.viewport', 'routes.legs', 'routes.polylineDetails', 'routes.legs.duration', 'routes.legs.distanceMeters'];


// docs at https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRoutes
// docs that define the response body like leg vs step
// https://developers.google.com/maps/documentation/routes/understand-route-response

const ROUTES_API_ENDPOINT =
  'https://routes.googleapis.com/directions/v2:computeRoutes';

export class RoutesApi {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async computeRoutes(
    from: google.maps.LatLngLiteral,
    to: google.maps.LatLngLiteral,
    options: any
  ) {
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'routes.viewport,routes.legs,routes.polylineDetails'
      },
      body: JSON.stringify(routeRequest)
    });

    if (!response.ok) {
      throw new Error(
        `Request failed with status: ${response.status} - ${response.statusText}`
      );
    }

    return await response.json();
  }
}
