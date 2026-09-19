import { HttpError } from "../lib/httpError.js";

export const MAX_IMAGE_DIMENSION = 1024;

const invalid = () => new HttpError(400, "That doesn't look like a valid JPEG image");

// Start-of-frame markers carry the image size (C4, C8 and CC share the range but aren't frames).
const isFrameMarker = (marker) => marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
// APP1..APP15 hold EXIF (which can include GPS coordinates), XMP and similar; COM is free text.
const isMetadataMarker = (marker) => (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

// Checks that `buffer` really is a JPEG of a sane size and returns a copy with all embedded
// metadata removed. Photos from phones often carry the exact location they were taken at,
// which must never be published on a profile.
export function cleanJpeg(buffer) {
  const looksLikeJpeg =
    Buffer.isBuffer(buffer) &&
    buffer.length >= 4 &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff &&
    buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  if (!looksLikeJpeg) throw invalid();

  const kept = [buffer.subarray(0, 2)];
  let dimensions = null;
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) throw invalid();
    const marker = buffer[offset + 1];
    if (marker === 0xff) {
      offset += 1; // padding byte before a marker
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    const end = offset + 2 + length;
    if (length < 2 || end > buffer.length) throw invalid();

    if (isFrameMarker(marker) && !dimensions) {
      if (length < 8) throw invalid();
      dimensions = { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }

    if (marker === 0xda) {
      // Start of scan: the rest is compressed image data, copied untouched.
      if (!dimensions) throw invalid();
      const { width, height } = dimensions;
      if (!width || !height) throw invalid();
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        throw new HttpError(400, `Photos can be at most ${MAX_IMAGE_DIMENSION}px wide or tall`);
      }
      kept.push(buffer.subarray(offset));
      return Buffer.concat(kept);
    }

    if (!isMetadataMarker(marker)) kept.push(buffer.subarray(offset, end));
    offset = end;
  }
  throw invalid();
}
