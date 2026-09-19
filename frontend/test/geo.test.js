import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_USER_LOCATION,
  distanceLabel,
  distanceMiles,
  formatMiles,
  hasCoordinates,
} from '../src/lib/geo.js';

const paloAlto = { lat: 37.4419, lng: -122.143 };
const sanFrancisco = { lat: 37.7749, lng: -122.4194 };

test('distance is zero for the same point and symmetric between two points', () => {
  assert.equal(distanceMiles(paloAlto, paloAlto), 0);
  assert.equal(distanceMiles(paloAlto, sanFrancisco), distanceMiles(sanFrancisco, paloAlto));
});

test('distance matches a known real-world value (Palo Alto to San Francisco is about 27.5 miles in a straight line)', () => {
  // Checked by hand: 0.333° of latitude is ~23.0 mi and 0.276° of longitude at 37.6°N is ~15.1 mi.
  const miles = distanceMiles(paloAlto, sanFrancisco);
  assert.ok(miles > 27 && miles < 28, `expected ~27.5 miles, got ${miles}`);
});

test('distance accepts numeric strings, as coordinates can arrive from JSON', () => {
  assert.equal(distanceMiles({ lat: '37.4419', lng: '-122.143' }, paloAlto), 0);
});

test('hasCoordinates rejects missing and non-numeric values but accepts zero', () => {
  assert.equal(hasCoordinates(paloAlto), true);
  assert.equal(hasCoordinates({ lat: 0, lng: 0 }), true);
  assert.equal(hasCoordinates({ lat: null, lng: -122 }), false);
  assert.equal(hasCoordinates({ lat: 'north', lng: -122 }), false);
  assert.equal(hasCoordinates(undefined), false);
});

test('formatMiles rounds sensibly across the boundaries', () => {
  assert.equal(formatMiles(0.04), 'under 0.1 mi');
  assert.equal(formatMiles(0.84), '0.8 mi');
  assert.equal(formatMiles(9.96), '10 mi');
  assert.equal(formatMiles(12.4), '12 mi');
});

test('the label only says "away" when the position is the real device location', () => {
  assert.equal(distanceLabel(0.8, 'device'), '0.8 mi away');
  assert.equal(distanceLabel(0.8, 'default'), '0.8 mi from Palo Alto center');
  assert.equal(distanceLabel(NaN, 'device'), '');
});

test('the default location is a valid point', () => {
  assert.equal(hasCoordinates(DEFAULT_USER_LOCATION), true);
});
