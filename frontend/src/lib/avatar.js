// Backgrounds for the initials shown when a member has no photo.
const PALETTE = ['#176b50', '#2f6fdb', '#b4541a', '#7a4fa3', '#a1344a', '#2a7f8e', '#6b6b12'];

// "Brandon Gao" -> "BG", "Madonna" -> "M", "  " -> "?".
export function initials(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : '';
  return (first + last).toUpperCase();
}

// The same name always gets the same color.
export function avatarColor(name = '') {
  let hash = 0;
  for (const char of String(name)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}
