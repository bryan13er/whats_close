// lib/PlacesAPI.js
import { apiRequest } from './apiRequest';

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const GEOCODE_ENDPOINT = 'https://geocode.googleapis.com/v4beta/geocode/places/';

export class PlacesAPI {
  constructor(apiKey) {
    if (!apiKey) throw new Error('PlacesAPI: API key is required');
    this.apiKey = apiKey;
  }

  /**
   * Get place predictions for a text input.
   *
   * Retry is disabled here: the user is still typing, so a stale retry would
   * either fight the next keystroke's request or return suggestions for an
   * outdated query. Better to fail fast and let the next keystroke try fresh.
   *
   * @param {string} input
   * @param {{ signal?: AbortSignal }} [requestOptions]
   * @returns {Promise<Array>}
   */
  async autocomplete(input, requestOptions = {}) {
    if (!input || input.length < 3) return [];
    const body = { input };

    const data = await apiRequest(AUTOCOMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify(body),
      signal: requestOptions.signal,
      retry: false,
      label: 'Autocomplete',
    });

    return data.suggestions ?? [];
  }

  /**
   * Get lat/lng and address for a place ID
   * @param {string} placeId
   * @param {string} [fieldMask]
   * @param {{ signal?: AbortSignal }} [requestOptions]
   */
  async getGeocodeV4(placeId, fieldMask = "location", requestOptions = {}) {
    if(!placeId){
      throw new Error("PlacesAPI.getGeocodeV4: placeId is required");
    }

    return apiRequest(`${GEOCODE_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
      signal: requestOptions.signal,
      label: 'GeocodeV4',
    });
  }

  async getGeocodeV3(placeId, requestOptions = {}) {
    // TODO: special case because gecode api can't have browser restrictions
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY

    if (!placeId) throw new Error('PlacesAPI.getGeocodeV3: placeId is required');
    if (!apiKey) throw new Error('PlacesAPI.getGeocodeV3: NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY is required');

    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;

    const data = await apiRequest(url, {
      method: 'GET',
      signal: requestOptions.signal,
      label: 'GeocodeV3',
    });

    console.log('Geocode raw response:', data);

    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) throw new Error('No geocode results for placeId: ' + placeId);

    return { location: { latitude: loc.lat, longitude: loc.lng } };
  }
}
