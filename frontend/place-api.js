import { apiRequest } from './lib/apiRequest';

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
    if (!apiKey) throw new Error("PlacesApi: API key is required")
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
   * @param {{ signal?: AbortSignal }} [requestOptions]
   * @returns {Promise<PlaceDetails>}
   */
  async getPlaceDetails(placeId, fieldMask = "rating,regularOpeningHours,priceLevel,id", requestOptions = {}){
    if(!placeId){
      throw new Error("PlacesApi.getPlaceDetails: placeId is required");
    }

    return apiRequest(`${PLACES_API_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      signal: requestOptions.signal,
      label: 'PlaceDetails',
    });
  }
}
