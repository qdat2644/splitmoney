import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordhash',
  'token',
  'resettoken',
  'jwttoken',
  'secret',
  'email',
  'text',
  'prompt',
  'raw',
  'filebuffer',
  'body',
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const RESET_TOKEN_RE = /\b[a-f0-9]{48,128}\b/gi;

let initialized = false;

export function initSentry() {
  if (!env.sentryDsn || initialized) return false;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    release: env.sentryRelease || undefined,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
    ignoreErrors: [/^Unauthorized$/i, /^Forbidden$/i, /^Not Found$/i],
  });

  initialized = true;
  return true;
}

export function isSentryEnabled() {
  return initialized;
}

export function captureServerError(error, req, context = {}) {
  if (!initialized) return null;

  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'backend');
    scope.setTag('method', req?.method || 'unknown');
    scope.setTag('path', safePath(req?.route?.path || req?.path || req?.originalUrl || 'unknown'));
    if (env.sentryRelease) scope.setTag('release', env.sentryRelease);
    if (req?.user?.userId) scope.setUser({ id: req.user.userId });
    scope.setContext('request', {
      method: req?.method,
      path: safePath(req?.originalUrl || req?.path),
      status: context.status,
    });
    return Sentry.captureException(error);
  });
}

export function captureUnhandledError(error, kind) {
  if (!initialized) return null;

  return Sentry.withScope((scope) => {
    scope.setTag('runtime', 'backend');
    scope.setTag('unhandled_kind', kind);
    return Sentry.captureException(error instanceof Error ? error : new Error(String(error)));
  });
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

function sanitizeValue(value, depth = 0, key = '') {
  if (depth > 5) return '[Filtered]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item, depth + 1, key));

  return Object.entries(value).reduce((safe, [entryKey, entryValue]) => {
    const normalizedKey = entryKey.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SENSITIVE_KEYS.has(normalizedKey) || SENSITIVE_KEYS.has(entryKey.toLowerCase())) {
      safe[entryKey] = '[Filtered]';
      return safe;
    }
    safe[entryKey] = sanitizeValue(entryValue, depth + 1, entryKey);
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
    const url = new URL(value, 'http://localhost');
    for (const key of [...url.searchParams.keys()]) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (SENSITIVE_KEYS.has(normalizedKey)) url.searchParams.set(key, '[Filtered]');
    }
    return url.toString().replace(/^http:\/\/localhost/, '');
  } catch {
    return sanitizeString(value);
  }
}

function safePath(value) {
  return sanitizeUrl(value || 'unknown');
}

export const __sentryForTests = {
  sanitizeValue,
  sanitizeString,
  sanitizeUrl,
  reset() {
    initialized = false;
  },
};
