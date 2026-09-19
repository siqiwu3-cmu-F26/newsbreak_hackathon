import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarColor, initials } from '../src/lib/avatar.js';
import { squareCrop } from '../src/lib/image.js';

test('squareCrop takes the largest centered square from landscape, portrait and square images', () => {
  assert.deepEqual(squareCrop(400, 200), { sx: 100, sy: 0, side: 200 });
  assert.deepEqual(squareCrop(200, 400), { sx: 0, sy: 100, side: 200 });
  assert.deepEqual(squareCrop(300, 300), { sx: 0, sy: 0, side: 300 });
  assert.deepEqual(squareCrop(301, 200), { sx: 51, sy: 0, side: 200 });
});

test('initials use the first and last word, and cope with odd names', () => {
  assert.equal(initials('Brandon Gao'), 'BG');
  assert.equal(initials('  ada   lovelace  '), 'AL');
  assert.equal(initials('Ada Augusta King Lovelace'), 'AL');
  assert.equal(initials('Madonna'), 'M');
  assert.equal(initials('高博'), '高');
  assert.equal(initials('😀 Smile'), '😀S');
  assert.equal(initials('   '), '?');
  assert.equal(initials(undefined), '?');
});

test('avatar colors are stable per name and always come from the palette', () => {
  assert.equal(avatarColor('Brandon Gao'), avatarColor('Brandon Gao'));
  assert.match(avatarColor('Brandon Gao'), /^#[0-9a-f]{6}$/);
  assert.match(avatarColor(''), /^#[0-9a-f]{6}$/);
});
