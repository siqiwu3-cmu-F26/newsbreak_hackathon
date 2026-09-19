import { request } from './auth.js';

export const saveBio = (bio) => request('/profile', { method: 'PATCH', body: { bio } });
export const uploadAvatar = (jpegBlob) => request('/profile/avatar', { method: 'PUT', blob: jpegBlob });
export const removeAvatar = () => request('/profile/avatar', { method: 'DELETE' });
export const fetchMember = (id) => request(`/members/${encodeURIComponent(id)}`);
// Photos need the sign-in token, so they're fetched as a Blob rather than used as an <img src>.
export const fetchAvatarBlob = (id) => request(`/members/${encodeURIComponent(id)}/avatar`, { asBlob: true });
