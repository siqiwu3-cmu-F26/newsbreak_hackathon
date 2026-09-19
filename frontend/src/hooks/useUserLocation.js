import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_LOCATION_NAME, DEFAULT_USER_LOCATION } from '../lib/geo.js';

const GEOLOCATION_OPTIONS = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 };

// `source` says how much to trust `position`: 'device' is the browser's real fix,
// 'default' is the fallback city center used until the user shares their location.
const initialState = { status: 'default', source: 'default', position: DEFAULT_USER_LOCATION, accuracy: null, error: '' };

const failure = (error) => (
  error?.code === 1
    ? `Location access is blocked in your browser, so distances are measured from ${DEFAULT_LOCATION_NAME}.`
    : `We couldn't find your location, so distances are measured from ${DEFAULT_LOCATION_NAME}.`
);

export default function useUserLocation() {
  const [state, setState] = useState(initialState);
  const latestRequest = useRef(0);

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setState((current) => ({ ...current, status: 'unavailable', error: failure() }));
      return;
    }
    const requestId = ++latestRequest.current;
    setState((current) => ({ ...current, status: 'locating', error: '' }));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (requestId !== latestRequest.current) return;
        setState({
          status: 'located',
          source: 'device',
          position: { lat: coords.latitude, lng: coords.longitude },
          accuracy: coords.accuracy,
          error: '',
        });
      },
      (error) => {
        if (requestId !== latestRequest.current) return;
        // Keep any earlier device fix; only the status and message change.
        setState((current) => ({ ...current, status: error.code === 1 ? 'denied' : 'unavailable', error: failure(error) }));
      },
      GEOLOCATION_OPTIONS,
    );
  }, []);

  // Never prompt on page load. If the user already allowed location for this site, use it quietly.
  useEffect(() => {
    let cancelled = false;
    const query = navigator.permissions?.query?.({ name: 'geolocation' });
    query?.then((permission) => {
      if (!cancelled && permission.state === 'granted') locate();
    }).catch(() => {});
    return () => {
      cancelled = true;
      latestRequest.current += 1;
    };
  }, [locate]);

  return { ...state, locate };
}
