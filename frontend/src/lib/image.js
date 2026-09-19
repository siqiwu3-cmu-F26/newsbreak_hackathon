export const AVATAR_SIZE = 256;
export const AVATAR_QUALITY = 0.86;
export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

// Largest centered square inside a width x height image.
export function squareCrop(width, height) {
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), side };
}

// Crops the picked image to a centered square and re-encodes it as a small JPEG. Re-encoding
// through a canvas also drops any metadata in the original, such as the GPS location phones
// embed in photos.
export async function resizeToAvatarJpeg(file, { size = AVATAR_SIZE, quality = AVATAR_QUALITY } = {}) {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file (JPEG, PNG or WebP).');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That image is too large. Choose one under 15 MB.');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("We couldn't read that image. Try a JPEG or PNG.");
  }
  try {
    const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff'; // transparent PNGs would otherwise turn black in a JPEG
    context.fillRect(0, 0, size, size);
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) throw new Error("We couldn't process that image. Try another one.");
    return blob;
  } finally {
    bitmap.close?.();
  }
}
