import { ApiError } from './apiError';

/**
 * Single chokepoint for error logging.
 * Console-only today; swap in Sentry / analytics here later without touching call sites.
 *
 * @param {unknown} err
 * @param {object} [context] - extra fields to attach (e.g. { hook: 'useDestinations', home, dest })
 */
export function logError(err, context = {}) {
  if (err instanceof ApiError) {
    // toJSON() flattens all fields; spreading keeps them at the top level so they're easy to scan
    console.error('[API ERROR]', { ...err.toJSON(), ...context });
    return;
  }

  if (err?.name === 'AbortError') {
    console.warn('[API ABORT]', { reason: err.message, ...context });
    return;
  }

  console.error('[ERROR]', err, context);
}
