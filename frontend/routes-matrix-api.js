import { apiRequest } from './lib/apiRequest';

// options for request:
// https://developers.google.com/maps/documentation/routes/reference/rest/v2/TopLevel/computeRouteMatrix

const ROUTES_MATRIX_API_ENDPOINT =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

export class RoutesMatrixAPI {
  constructor(apiKey){
    if (!apiKey) throw new Error("RoutesMatrixAPI: API key is required")
    this.apiKey = apiKey;
  }

  /**
   * Compute a matrix for a single travel mode
   * @param {{lat:number, lng:number}} from
   * @param {Array<{lat:number, lng:number}>} to
   * @param {"DRIVE"|"WALK"|"TRANSIT"} travelMode
   * @param {{ signal?: AbortSignal }} [requestOptions]
   * @returns {Promise<Array<{destinationIndex:number, duration:number, distance:number}>>}
   */
  async computeMatrix(from, to, travelMode = "DRIVE", requestOptions = {}){
    if (!from || !to || to.length === 0) {
      throw new Error("RoutesMatrixAPI.computeMatrix: origin and at least one destination are required");
    }

    const body = {
      origins: [
        {
          waypoint: {
            location: {
                  latLng:{
                    longitude: from.lng,
                    latitude: from.lat
                  }
            }
          }
        },
      ],

      destinations: to.map(destination => ({
        waypoint: {
          location: {
                latLng: {
                  longitude: destination.lng,
                  latitude: destination.lat
                }
            }
          }
        })),

      travelMode,
    }

    return apiRequest(ROUTES_MATRIX_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
      },
      body: JSON.stringify(body),
      signal: requestOptions.signal,
      label: `RoutesMatrix:${travelMode}`,
    });
  }
}
