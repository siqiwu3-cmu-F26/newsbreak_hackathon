import { API_BASE_URL } from '../config.js';

const TOKEN_KEY = 'localconnect.auth.token';

// Storage can throw (private windows, blocked cookies); auth then just lasts for the page.
export const tokenStore = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* keep the in-memory session */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* nothing to clear */ }
  },
};

export class ApiError extends Error {
  constructor(message, { status = 0, fields, code, data } = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.code = code;
    this.data = data;
  }
}

// `body` is sent as JSON; `blob` is sent as-is with its own content type (used for photos).
// `asBlob` returns the response as a Blob instead of parsing JSON.
export async function request(path, { method = 'GET', body, blob, asBlob = false, token = tokenStore.get() } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(blob ? { 'Content-Type': blob.type } : body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: blob ?? (body ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError('Cannot reach the server. Check your connection and try again.');
  }
  if (response.ok && asBlob) return response.blob();
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', {
      status: response.status,
      fields: data.fields,
      code: data.code,
      data,
    });
  }
  return data;
}

export const signup = (details) => request('/auth/signup', { method: 'POST', body: details, token: null });
export const login = (credentials) => request('/auth/login', { method: 'POST', body: credentials, token: null });
export const logout = (token) => request('/auth/logout', { method: 'POST', token });
export const fetchMe = () => request('/auth/me');
export const verifyIdentity = (details) => request('/auth/verify-identity', { method: 'POST', body: details });
export const verifyAddress = (details) => request('/auth/verify-address', { method: 'POST', body: details });
export const fetchCredits = () => request('/credits');
export const publishSkill = (draft) => request('/experiences', { method: 'POST', body: draft });
export const requestExperience = (experienceId, scheduledTime) => request(`/experiences/${experienceId}/request`, {
  method: 'POST',
  body: { scheduledTime },
});
