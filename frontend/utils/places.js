/*
helper functions for workign with the places api and grouping data into the table
*/

import { cleanTimeRes } from './time';

/*
takes the out of order output from the route matrix api
and converts it into an object keyed by destination index
so that the table is filled correctly 
*/
export function createDataLookup(res){
  if (!res || !Array.isArray(res)) return {};

  const lookup = {};
  res.forEach(item => {
    lookup[item.destinationIndex] = item;
  });
  return lookup;
}

export const priceMap = {
  PRICE_LEVEL_UNSPECIFIED: null,
  PRICE_LEVEL_FREE: "$0",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$"
};

/**
 * @typedef {Object} DestinationPlace
 * @property {'dest'} field i.e. input type origin or dest
 * @property {string} label i.e. name of locaiton
 * @property {string} placeId gogole place id
 * @property {number} lat
 * @property {number} lng
 */

/**
 * @param {DestinationPlace} dest
 */
export function prepRowData(dest, driveData, walkData, transitData, placeInfo){
  return {
    name:        dest.label,
    desPlaceId:  dest.placeId,
    destObj:     dest,
    distance:    driveData.distanceMeters,
    driveTime:   cleanTimeRes(driveData),
    walkTime:    cleanTimeRes(walkData),
    transitTime: cleanTimeRes(transitData),
    ratings:     placeInfo?.rating     ?? "N/A",
    cost:        priceMap[placeInfo?.priceLevel] ?? "N/A",
  };
}
