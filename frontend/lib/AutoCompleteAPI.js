// lib/PlacesAPI.js

const AUTOCOMPLETE_ENDPOINT = 'https://places.googleapis.com/v1/places:autocomplete';
const GEOCODE_ENDPOINT = 'https://geocode.googleapis.com/v4beta/geocode/places/';

export class PlacesAPI {
  constructor(apiKey) {
    if (!apiKey) throw new Error('API key is required');
    this.apiKey = apiKey;
  }

  /**
   * Get place predictions for a text input
   * @param {string} input
   * @returns {Promise<Array>}
   */
  async autocomplete(input) {
    if (!input || input.length < 3) return [];
    const body = { input };
 
    const response = await fetch(AUTOCOMPLETE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Places API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions ?? [];
  }

  /**
   * Get lat/lng and address for a place ID
   * @param {string} placeId
   */
  async getGeocodeV4(placeId, fieldMask="location") {
    if(!placeId){
      throw new Error("PlaceId required");
    }

    const response = await fetch(`${GEOCODE_ENDPOINT}/${encodeURIComponent(placeId)}`, {
      method: 'GET',
      headers: {
        "X-Goog-Api-Key": this.apiKey,
        "X-Goog-FieldMask": fieldMask,
      },
    });

    if (!response.ok) {
      throw new Error(`Gecode API error (faile to fetch the lat and long based on PlaceId): ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getGeocodeV3(placeId) {
    // TODO: special case because gecode api can't have browser restrictions
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_GEOCODING_API_KEY
    
    if (!placeId) throw new Error('placeId required');
  
    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
  
    const response = await fetch(url);
  
    if (!response.ok) {
      throw new Error(`Geocode error: ${response.status} ${response.statusText}`);
    }
  
    const data = await response.json();
    console.log('Geocode raw response:', data);

    const loc = data.results?.[0]?.geometry?.location;
  
    if (!loc) throw new Error('No geocode results for placeId: ' + placeId);
  
    return { location: { latitude: loc.lat, longitude: loc.lng } };
  }
}