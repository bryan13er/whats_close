/*
helper functions for workign with the places api and grouping data into the table
*/

import { cleanTimeRes } from './time';

/**
 * @typedef {import('../types').Place} Place
 * @typedef {import('../types').Row} Row
 * @typedef {import('../types').MatrixCell} MatrixCell
 * @typedef {import('../types').PlaceDetails} PlaceDetails
 */

/**
 * Takes the out-of-order output from the Routes Matrix API and converts it
 * into an object keyed by `destinationIndex` so destRows can be filled correctly.
 *
 * @param {MatrixCell[]} res
 * @returns {Object<number, MatrixCell>}
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
 * Build a single Row from a Place + matrix data + place details.
 *
 * @param {Place} dest
 * @param {MatrixCell} driveData
 * @param {MatrixCell} walkData
 * @param {MatrixCell} transitData
 * @param {PlaceDetails} [placeInfo]
 * @returns {Row}
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
