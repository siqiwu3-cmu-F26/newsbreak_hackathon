import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import "../person5.css";

const DEFAULT_LOCATIONS = [
  { id: "community_01", name: "Flower Arranging", lat: 37.4444, lng: -122.1612, type: "community" },
  { id: "business_01", name: "Café Venetia", lat: 37.4452, lng: -122.1631, type: "business" },
  { id: "business_02", name: "Dinner", lat: 37.4392, lng: -122.1584, type: "business" },
  { id: "business_03", name: "Sunset Walk", lat: 37.4302, lng: -122.1425, type: "business" },
];

function makeProjection(locations) {
  const latitudes = locations.map((item) => Number(item.lat)).filter(Number.isFinite);
  const longitudes = locations.map((item) => Number(item.lng)).filter(Number.isFinite);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  return (location) => ({
    x: 68 + ((Number(location.lng) - minLng) / lngRange) * 664,
    y: 54 + ((maxLat - Number(location.lat)) / latRange) * 352,
  });
}

export default function MapView({ activities = DEFAULT_LOCATIONS, selectedId, onSelect }) {
  const [localSelectedId, setLocalSelectedId] = useState(null);
  const [dismissedId, setDismissedId] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState(null);
  const canvasRef = useRef(null);
  const popoverRef = useRef(null);
  const mapRef = useRef(null);
  const mapId = useId();
  const validLocations = useMemo(
    () => activities.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng))),
    [activities],
  );
  const points = useMemo(() => {
    if (!validLocations.length) return [];
    const project = makeProjection(validLocations);
    return validLocations.map((location, index) => ({ ...location, index, ...project(location) }));
  }, [validLocations]);
  const activeId = selectedId ?? localSelectedId;
  const active = points.find((point) => point.id === activeId && point.id !== dismissedId);
  const route = points.map((point) => `${point.x},${point.y}`).join(" ");

  useLayoutEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    const popover = popoverRef.current;
    const positionPopover = () => {
      const marker = canvas.querySelector('.route-map__marker--active');
      if (!marker || !popover) return;
      const bounds = canvas.getBoundingClientRect();
      const pin = marker.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const gap = 8;
      const left = Math.max(gap, Math.min(pin.left + pin.width / 2 - bounds.left - width / 2, bounds.width - width - gap));
      const below = pin.bottom - bounds.top + gap;
      const top = below + height <= bounds.height - gap
        ? below
        : Math.max(gap, pin.top - bounds.top - height - gap);
      setPopoverPosition({ left, top });
    };
    positionPopover();
    const observer = new ResizeObserver(positionPopover);
    observer.observe(canvas);
    observer.observe(popover);
    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const dismiss = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !mapRef.current?.contains(event.target)) {
        setDismissedId(active.id);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', dismiss);
    };
  }, [active]);

  const selectPoint = (point) => {
    setDismissedId(active?.id === point.id ? point.id : null);
    setLocalSelectedId(point.id);
    if (onSelect) onSelect(point);
  };

  if (!points.length) {
    return (
      <div className="route-map route-map--empty">
        <span>⌖</span>
        <p>Locations will appear here when your itinerary is ready.</p>
      </div>
    );
  }

  return (
    <section ref={mapRef} className="route-map" aria-label="Itinerary map">
      <div className="route-map__header">
        <div>
          <span className="section-kicker">Route preview</span>
          <h3>Your day, mapped</h3>
        </div>
        <span className="route-map__count">{points.length} stops</span>
      </div>

      <div ref={canvasRef} className="route-map__canvas" onClick={event => {
        if (!event.target.closest('.route-map__marker')) setDismissedId(active?.id ?? null);
      }}>
        <svg viewBox="0 0 800 460" role="group" aria-label={`Map with ${points.length} itinerary stops`}>
          <defs>
            <pattern id={`${mapId}-grid`} width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="#dfe8de" strokeWidth="1" />
            </pattern>
            <filter id={`${mapId}-shadow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.18" />
            </filter>
          </defs>
          <rect width="800" height="460" fill="#f4f6ef" />
          <rect width="800" height="460" fill={`url(#${mapId}-grid)`} />
          <path d="M-20 350 C140 250 245 365 420 250 S680 120 840 170" className="route-map__road" />
          <path d="M80 -20 C150 90 120 210 215 500" className="route-map__road route-map__road--minor" />
          <path d="M590 -20 C520 90 610 250 545 500" className="route-map__road route-map__road--minor" />
          <rect x="630" y="300" width="210" height="190" rx="80" fill="#dcefe8" />
          <text x="675" y="395" className="route-map__water-label">BAYLANDS</text>
          {points.length > 1 && <polyline points={route} className="route-map__route" />}
          {points.map((point) => {
            const isActive = point.id === active?.id;
            return (
              <g
                key={point.id || point.index}
                className={`route-map__marker${isActive ? " route-map__marker--active" : ""}`}
                transform={`translate(${point.x} ${point.y})`}
                onClick={() => selectPoint(point)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectPoint(point);
                  }
                }}
                role="button"
                tabIndex="0"
                aria-label={`Stop ${point.index + 1}: ${point.name}`}
                aria-pressed={isActive}
                aria-describedby={isActive ? `${mapId}-details` : undefined}
              >
                <circle r={isActive ? 24 : 20} filter={`url(#${mapId}-shadow)`} />
                <text y="6">{point.index + 1}</text>
              </g>
            );
          })}
        </svg>
        {active && (
          <div ref={popoverRef} id={`${mapId}-details`} role="status" className="route-map__popover" style={popoverPosition ?? { visibility: 'hidden' }}>
            <strong>{active.index + 1}. {active.name}</strong>
            <span>{active.startTime || (active.type === "community" ? "Community experience" : "Local stop")}</span>
          </div>
        )}
      </div>

      <ol className="route-map__legend">
        {points.map((point) => (
          <li key={point.id || point.index}>
            <button type="button" onClick={() => selectPoint(point)} aria-pressed={point.id === active?.id}>
              <span>{point.index + 1}</span>
              <span>
                <strong>{point.name}</strong>
                <small>{point.startTime || point.location || "Palo Alto"}</small>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
