/**
 * Detailed error class for HTTP requests so failures are easy to trace in the console.
 *
 * Carries:
 *   - status / statusText  → HTTP response status
 *   - code                 → 'TIMEOUT' | 'NETWORK' | 'PARSE' | 'ABORT' | http status number
 *   - endpoint / method    → URL and verb of the request
 *   - googleStatus         → Google's `error.status` field (e.g. 'INVALID_ARGUMENT', 'PERMISSION_DENIED')
 *   - googleMessage        → Google's `error.message` field — usually the most actionable detail
 *   - googleDetails        → Google's `error.details` array (field violations, links, etc.)
 *   - attempt              → which retry attempt failed (1-indexed)
 *   - label                → short tag for the call site (e.g. 'RoutesMatrix')
 */
export class ApiError extends Error {
  constructor({
    message,
    status,
    statusText,
    code,
    endpoint,
    method,
    googleStatus,
    googleMessage,
    googleDetails,
    attempt,
    label,
    cause,
  }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.code = code;
    this.endpoint = endpoint;
    this.method = method;
    this.googleStatus = googleStatus;
    this.googleMessage = googleMessage;
    this.googleDetails = googleDetails;
    this.attempt = attempt;
    this.label = label;
    if (cause) this.cause = cause;
  }

  /**
   * Compact object suitable for `console.error` / structured logging.
   * `Error` itself stringifies to just the message; this surfaces all fields.
   */
  toJSON() {
    return {
      name: this.name,
      label: this.label,
      message: this.message,
      code: this.code,
      status: this.status,
      statusText: this.statusText,
      endpoint: this.endpoint,
      method: this.method,
      googleStatus: this.googleStatus,
      googleMessage: this.googleMessage,
      googleDetails: this.googleDetails,
      attempt: this.attempt,
    };
  }
}

/** True for HTTP statuses worth retrying (transient server errors + rate limits). */
export function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}
