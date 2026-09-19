import { useEffect, useId, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_LOCATION_NAME, distanceLabel, hasCoordinates } from '../lib/geo.js';
import './CommunityMap.css';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const ACCURACY_CIRCLE_MAX_METERS = 5000;

// Custom HTML markers, so no image assets are needed and the look matches the site.
const experienceIcon = L.divIcon({
  className: 'community-map__pin',
  html: '<span aria-hidden="true">✦</span>',
  iconSize: [34, 34],
  iconAnchor: [17, 40],
  popupAnchor: [0, -38],
});
const userIcon = L.divIcon({
  className: 'community-map__you',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

// Popups are built from DOM nodes and textContent, never HTML strings, because experience
// names and hosts can come from user-submitted listings.
function line(tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

function experiencePopup(experience, distance, onView) {
  const root = document.createElement('div');
  root.className = 'community-map__popup';
  root.append(line('strong', experience.name));
  root.append(line('span', `Hosted by ${experience.host} · ${experience.location}`));
  if (distance) root.append(line('span', `⌖ ${distance}`, 'community-map__distance'));
  const button = line('button', 'View experience →', 'community-map__view');
  button.type = 'button';
  button.addEventListener('click', () => onView(experience));
  root.append(button);
  return root;
}

function userPopup(isDevice) {
  const root = document.createElement('div');
  root.className = 'community-map__popup';
  root.append(line('strong', isDevice ? 'You are here' : DEFAULT_LOCATION_NAME));
  root.append(
    line('span', isDevice ? 'Based on your device location' : 'Share your location for exact distances'),
  );
  return root;
}

export default function CommunityMap({ experiences, location, onSelect }) {
  const { position, source, accuracy, status, error, locate } = location;
  const headingId = useId();
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  useEffect(() => {
    const map = L.map(containerRef.current, {
      scrollWheelZoom: false, // don't hijack page scrolling
      dragging: !L.Browser.mobile, // one-finger drags should still scroll the page on phones
    }).setView([position.lat, position.lng], 13);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map);
    layersRef.current = { experiences: L.layerGroup().addTo(map), user: L.layerGroup().addTo(map) };
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // The map is created once; markers below react to data changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    layers.experiences.clearLayers();
    layers.user.clearLayers();

    const points = [[position.lat, position.lng]];
    for (const experience of experiences.filter(hasCoordinates)) {
      const latLng = [Number(experience.lat), Number(experience.lng)];
      const distance = distanceLabel(experience.distanceMiles, source);
      const marker = L.marker(latLng, { icon: experienceIcon, title: experience.name, keyboard: true });
      marker.bindPopup(experiencePopup(experience, distance, (item) => onSelectRef.current?.(item)));
      marker.once('add', () => {
        marker.getElement()?.setAttribute('aria-label', `${experience.name}${distance ? `, ${distance}` : ''}`);
      });
      marker.addTo(layers.experiences);
      points.push(latLng);
    }

    const me = L.marker([position.lat, position.lng], {
      icon: userIcon,
      title: source === 'device' ? 'Your location' : DEFAULT_LOCATION_NAME,
      keyboard: true,
      zIndexOffset: 1000,
    });
    me.bindPopup(userPopup(source === 'device'));
    me.once('add', () => {
      me.getElement()?.setAttribute('aria-label', source === 'device' ? 'Your location' : DEFAULT_LOCATION_NAME);
    });
    me.addTo(layers.user);
    if (source === 'device' && accuracy > 0 && accuracy < ACCURACY_CIRCLE_MAX_METERS) {
      L.circle([position.lat, position.lng], { radius: accuracy, className: 'community-map__accuracy', interactive: false })
        .addTo(layers.user);
    }

    if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 15 });
    else map.setView(points[0], 14);
  }, [experiences, position.lat, position.lng, source, accuracy]);

  const locating = status === 'locating';
  return (
    <section className="community-map" aria-labelledby={headingId}>
      <div className="community-map__header">
        <div>
          <span className="section-kicker">Where it's happening</span>
          <h3 id={headingId}>Experiences near you</h3>
          <p className="community-map__source">
            {source === 'device'
              ? 'Distances are measured from your device location.'
              : `Distances are measured from ${DEFAULT_LOCATION_NAME}. Share your location for exact distances.`}
          </p>
        </div>
        <button className="person5-button person5-button--primary" type="button" onClick={locate} disabled={locating}>
          {locating ? 'Locating…' : source === 'device' ? '⌖ Update my location' : '⌖ Use my location'}
        </button>
      </div>

      {error && <p className="community-map__error" role="status">{error}</p>}

      <div
        ref={containerRef}
        className="community-map__canvas"
        role="region"
        aria-label="Map of community experiences and your location"
      />

      <ul className="community-map__legend" aria-label="Map key">
        <li><span className="community-map__legend-pin" aria-hidden="true">✦</span> Community experience</li>
        <li><span className="community-map__legend-you" aria-hidden="true" /> You</li>
        <li className="community-map__legend-note">The same experiences are listed below with their distances.</li>
      </ul>
    </section>
  );
}
