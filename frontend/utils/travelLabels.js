/**
 * Generates an average distance label for a given travel mode.
 * @param {string} mode - e.g., 'drive', 'walk', 'transit'
 * @returns {string} e.g., 'avg. drive distance'
 */
export function getAvgDistanceLabel(mode) {
  return `avg. ${mode} distance`;
}

/**
 * Generates an average time label for a given travel mode.
 * @param {string} mode - e.g., 'drive', 'walk', 'transit'
 * @returns {string} e.g., 'avg. drive distance'
 */
export function getAvgTimeLabel(mode) {
  return `avg. ${mode} time`;
}