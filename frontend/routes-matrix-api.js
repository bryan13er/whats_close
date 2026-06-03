

// options for request: 
// https://developers.google.com/maps/documentation/routes/reference/rest/v2/destinationspLevel/computeRouteMatrix

const ROUTES_MATRIX_API_ENDPOINT =
  "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

export class RoutesMatrixAPI {
  constructor(apiKey){
    if (!apiKey) throw new Error("API key is needed")
    this.apiKey = apiKey;
  }

  /**
   * Compute a matrix for a single travel mode
   * @param {Array<{lat:number, lng:number}>} origins
   * @param {Array<{lat:number, lng:number}>} destinations
   * @param {"DRIVE"|"WALK"|"TRANSIT"} travelMode
   * @returns {Promise<Array<{destinationIndex:number, duration:number, distance:number}>>}
   */
  async computeMatrix(origins, destinations, travelMode = "DRIVE"){
    if (!origins || !destinations || destinations.length === 0) {
      throw new Error("Origin and at least one destination are required");
    }

    const body = {

      origins: origins.map(origin => ({
        waypoint: {
          location: {
              latLng:{
                longitude: origin.lng,
                latitude: origin.lat
              }
          }
        }
      })),
      
      destinations: destinations.map(destination => ({
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

    const response = await fetch(ROUTES_MATRIX_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Routes MATRIX API error: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
}