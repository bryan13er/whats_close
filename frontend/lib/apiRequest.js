import { ApiError, isRetryableStatus } from './apiError';

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 3;

/** Exponential backoff with jitter: 200ms, 400ms, 800ms (+ up to 100ms jitter). */
function backoffMs(attempt) {
  return 200 * 2 ** (attempt - 1) + Math.random() * 100;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Best-effort parse of Google API error envelope:
 *   { error: { code, message, status, details } }
 */
async function parseGoogleError(response) {
  try {
    const body = await response.json();
    const err = body?.error;
    if (!err) return {};
    return {
      code: err.code,
      googleStatus: err.status,
      googleMessage: err.message,
      googleDetails: err.details,
    };
  } catch {
    return {};
  }
}

/**
 * Centralized fetch wrapper for all Google Maps API calls.
 *
 * Features:
 *  - per-attempt timeout via internal AbortController (default 10s)
 *  - external AbortSignal support (for stale-request cancellation in hooks/components)
 *  - exponential backoff retry on 429 / 5xx / network / timeout (default 3 attempts)
 *  - honors Retry-After header for 429
 *  - parses Google's JSON error envelope into ApiError fields
 *  - distinguishes user-initiated abort vs internal timeout
 *
 * @param {string|URL} url
 * @param {object} options
 * @param {string} [options.method='GET']
 * @param {object} [options.headers]
 * @param {string} [options.body]
 * @param {AbortSignal} [options.signal]            external signal (caller-controlled cancel)
 * @param {number} [options.timeoutMs=10000]        per-attempt timeout
 * @param {number} [options.maxAttempts=3]          total attempts including the first
 * @param {boolean} [options.retry=true]            set to false for non-retryable endpoints (e.g. autocomplete)
 * @param {string} [options.label]                  short tag for logs/errors
 * @returns {Promise<any>} parsed JSON body
 * @throws {ApiError}
 */
export async function apiRequest(url, options = {}) {
  const {
    method = 'GET',
    headers,
    body,
    signal: externalSignal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    retry = true,
    label,
  } = options;

  const endpoint = url.toString();
  const totalAttempts = retry ? maxAttempts : 1;
  let lastError;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    // Internal controller for timeout. We chain externalSignal → controller so a single
    // controller.signal carries both timeout aborts and caller-initiated aborts.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException(`Timed out after ${timeoutMs}ms`, 'TimeoutError'));
    }, timeoutMs);

    const onExternalAbort = () => controller.abort(externalSignal.reason);
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort(externalSignal.reason);
      else externalSignal.addEventListener('abort', onExternalAbort);
    }

    try {
      const response = await fetch(endpoint, { method, headers, body, signal: controller.signal });

      if (!response.ok) {
        const googleErr = await parseGoogleError(response);
        const err = new ApiError({
          message: `${label ?? 'API'} failed: ${response.status} ${response.statusText}`,
          status: response.status,
          statusText: response.statusText,
          endpoint,
          method,
          attempt,
          label,
          ...googleErr,
        });

        if (retry && isRetryableStatus(response.status) && attempt < totalAttempts) {
          // 429: respect Retry-After if present, otherwise use backoff
          let delay = backoffMs(attempt);
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            const seconds = retryAfter ? parseInt(retryAfter, 10) : NaN;
            if (!Number.isNaN(seconds)) delay = Math.max(delay, seconds * 1000);
          }
          lastError = err;
          await sleep(delay);
          continue;
        }

        throw err;
      }

      // Parse JSON in a guarded block so malformed bodies surface as PARSE errors
      try {
        return await response.json();
      } catch (parseErr) {
        throw new ApiError({
          message: `${label ?? 'API'} response was not valid JSON: ${parseErr.message}`,
          code: 'PARSE',
          status: response.status,
          endpoint,
          method,
          attempt,
          label,
          cause: parseErr,
        });
      }
    } catch (err) {
      // The internal controller fires AbortError for both timeouts and external aborts.
      // We tell them apart by checking the externalSignal — if it's aborted, the caller did it.
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        if (externalSignal?.aborted) {
          // Caller cancelled (e.g. deps changed) — propagate as-is, do not retry
          throw err;
        }
        // Our timeout fired
        const timeoutErr = new ApiError({
          message: `${label ?? 'API'} timed out after ${timeoutMs}ms`,
          code: 'TIMEOUT',
          endpoint,
          method,
          attempt,
          label,
          cause: err,
        });
        if (retry && attempt < totalAttempts) {
          lastError = timeoutErr;
          await sleep(backoffMs(attempt));
          continue;
        }
        throw timeoutErr;
      }

      // Already an ApiError from the !response.ok branch — re-throw without re-wrapping
      if (err instanceof ApiError) throw err;

      // Network failure (DNS, offline, CORS reject) — fetch itself rejected
      const networkErr = new ApiError({
        message: `${label ?? 'API'} network error: ${err.message}`,
        code: 'NETWORK',
        endpoint,
        method,
        attempt,
        label,
        cause: err,
      });
      if (retry && attempt < totalAttempts) {
        lastError = networkErr;
        await sleep(backoffMs(attempt));
        continue;
      }
      throw networkErr;
    } finally {
      clearTimeout(timeoutId);
      if (externalSignal) externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }

  // Unreachable, but satisfies static analysis
  throw lastError;
}
