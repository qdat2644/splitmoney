import * as Sentry from '@sentry/react';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordhash',
  'token',
  'resettoken',
  'jwttoken',
  'email',
  'body',
  'text',
  'prompt',
  'raw',
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const RESET_TOKEN_RE = /\b[a-f0-9]{48,128}\b/gi;

let initialized = false;

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || initialized) return false;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    ignoreErrors: [/^Unauthorized$/i, /^Forbidden$/i, /^Not Found$/i],
  });
  initialized = true;
  return true;
}

export function scrubSentryEvent(event) {
  const next = sanitizeValue(event);
  if (next.request) {
    next.request.headers = sanitizeValue(next.request.headers || {});
    next.request.cookies = undefined;
    next.request.data = undefined;
    next.request.query_string = sanitizeString(next.request.query_string || '');
    next.request.url = sanitizeUrl(next.request.url || '');
  }
  if (next.user) {
    next.user = next.user.id ? { id: next.user.id } : undefined;
  }
  return next;
}

export function captureFrontendError(error, context = {}) {
  if (!initialized) return null;
  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'frontend');
    if (context.route) scope.setTag('route', sanitizeUrl(context.route));
    return Sentry.captureException(error);
  });
}

function sanitizeValue(value, depth = 0) {
  if (depth > 5) return '[Filtered]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1));

  return Object.entries(value).reduce((safe, [key, item]) => {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEYS.has(key.toLowerCase())) {
      safe[key] = '[Filtered]';
      return safe;
    }
    safe[key] = sanitizeValue(item, depth + 1);
    return safe;
  }, {});
}

function sanitizeString(value) {
  return String(value)
    .replace(EMAIL_RE, '[FilteredEmail]')
    .replace(JWT_RE, '[FilteredJwt]')
    .replace(RESET_TOKEN_RE, '[FilteredToken]');
}

function sanitizeUrl(value) {
  if (!value) return value;
  try {
    const url = new URL(value, window.location.origin);
    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (SENSITIVE_KEYS.has(normalizedKey)) url.searchParams.set(key, '[Filtered]');
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return sanitizeString(value);
  }
}

export const __sentryForTests = {
  sanitizeValue,
  sanitizeString,
  sanitizeUrl,
  reset() {
    initialized = false;
  },
};
