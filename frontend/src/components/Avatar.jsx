import { useEffect, useState } from 'react';
import { avatarColor, initials } from '../lib/avatar.js';
import { fetchAvatarBlob } from '../services/profile.js';

// Photos need the sign-in token, so they're fetched as blobs and shown through object URLs.
// Cached per member and photo version so the same photo isn't downloaded again on every page.
const photos = new Map();

function loadPhoto(userId, key) {
  if (!photos.has(key)) {
    const promise = fetchAvatarBlob(userId).then((blob) => URL.createObjectURL(blob));
    promise.catch(() => photos.delete(key)); // let a later render try again
    photos.set(key, promise);
  }
  return photos.get(key);
}

// A member's photo, or their initials on a colored circle when there's no photo (or it can't
// load). `version` is the member's avatarVersion: it changes whenever the photo does.
export default function Avatar({ userId, name, version, size = 40, decorative = false }) {
  const key = version ? `${userId}:${version}` : null;
  const [loaded, setLoaded] = useState({ key: null, url: null });

  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    loadPhoto(userId, key)
      .then((url) => { if (!cancelled) setLoaded({ key, url }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key, userId]);

  const url = key && loaded.key === key ? loaded.url : null;
  return (
    <span
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: url ? '#e5f1e9' : avatarColor(name), fontSize: size * 0.4 }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : `${name}'s profile photo`}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {url
        ? <img src={url} alt="" className="size-full object-cover" />
        : <span aria-hidden="true" className="font-semibold leading-none text-white">{initials(name)}</span>}
    </span>
  );
}
