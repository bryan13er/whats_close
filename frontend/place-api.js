const PLACES_API_ENDPOINT = "https://places.googleapis.com/v1/places";

/**
 * @typedef {{day:number, hour:number, minute:number}} PlaceTimeOfWeek
 * @typedef {{open: PlaceTimeOfWeek, close: PlaceTimeOfWeek}} OpeningPeriod
 * @typedef {{
 *   openNow: boolean,
 *   periods: OpeningPeriod[],
 *   weekdayDescriptions: string[],
 *   nextCloseTime?: string,
 * }} RegularOpeningHours
 * @typedef {{
 *   rating?: number,
 *   regularOpeningHours?: RegularOpeningHours,
 * }} PlaceDetails
 */

export class PlacesApi {
  constructor(apiKey){
    if (!apiKey) throw new Error("API key is needed")
    this.apiKey = apiKey;
  }

  /**
   * get details on a place 
   * adjust fildmask args as needed
   * reference:
   * for request structure
   * https://developers.google.com/maps/documentation/places/web-service/place-details
   * for response fieldMask args
   * https://developers.google.com/maps/documentation/places/web-service/reference/rest/v1/places#PriceLevel
   * @param {string} placeId the unique id key representing a place
   * @param {string} [fieldMask] the field mask for the response data
   * @returns {Promise<PlaceDetails>}
   */
  async getPlaceDetails(placeId, fieldMask = "rating,regularOpeningHours,priceLevel,id"){
    if(!placeId){
      throw new Error("PlaceId required");
    }

    const response = await fetch(`${PLACES_API_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
}
