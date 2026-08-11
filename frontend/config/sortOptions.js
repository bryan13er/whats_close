// 1. Define the flat enum for your internal logic checks
export const SORT_MODES = Object.freeze({
  NONE: 'none',
  PRICE: 'price',
  RATING: 'rating',
  DISTANCE: 'distance',
  ETA: 'eta',
  AVG_TIME: 'avgTime',
  AVG_DISTANCE: 'avgDistance',
});

export const SORT_OPTIONS = {
  destination: [
    { key: SORT_MODES.NONE,     label: 'Date',     descLabel: 'Newest',      ascLabel: 'Oldest' },
    { key: SORT_MODES.ETA,      label: 'ETA',       descLabel: 'Longest',     ascLabel: 'Shortest' },
    { key: SORT_MODES.DISTANCE, label: 'Distance',  descLabel: 'Farthest',    ascLabel: 'Closest' },
    { key: SORT_MODES.PRICE,    label: 'Price',     descLabel: 'High to Low',  ascLabel: 'Low to High' },
    { key: SORT_MODES.RATING,   label: 'Rating',    descLabel: 'Highest',     ascLabel: 'Lowest' },
  ],
  home: [
    { key: SORT_MODES.NONE,         label: 'Date',         descLabel: 'Newest',   ascLabel: 'Oldest' },
    { key: SORT_MODES.AVG_DISTANCE, label: 'Avg Distance', descLabel: 'Farthest', ascLabel: 'Closest' },
    { key: SORT_MODES.AVG_TIME,     label: 'Avg ETA',      descLabel: 'Longest',  ascLabel: 'Shortest' },
    { key: SORT_MODES.RATING,       label: 'Rating',       descLabel: 'Highest',  ascLabel: 'Lowest' },
    { key: SORT_MODES.PRICE,        label: 'Price',        descLabel: 'High to Low', ascLabel: 'Low to High' },
  ],
};