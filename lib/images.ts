// Shrink photos before they are uploaded.
//
// A photo straight off a modern phone camera is 3-5MB and several thousand
// pixels wide. Nothing in this app ever shows one at more than phone width, so
// every one of those megabytes is paid for twice: once by the person on their
// data plan when they post, and again by everyone who scrolls past it in the
// feed. It also eats the storage quota fastest of anything the app does.
//
// Shrinking to a long edge that still looks sharp on a phone cuts a typical
// upload by roughly ten times with no visible difference.

import { Image } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Read the pixel size without decoding and re-encoding the file, which is what
// asking the manipulator for a no-op copy would cost.
function measure(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

// Long edge in pixels. 1080 is wider than any phone screen this renders on,
// so a listing photo is still sharp full-screen and on a 3x display.
export const LISTING_MAX_DIM = 1080;
// Avatars are never drawn larger than about 96pt, so this is already generous.
export const AVATAR_MAX_DIM = 512;

/**
 * Returns a resized copy of the image, or the original uri if anything goes
 * wrong. Never throws: a photo that fails to shrink should still upload at
 * full size rather than stopping someone from posting.
 */
export async function shrinkImage(
  uri: string,
  maxDim: number = LISTING_MAX_DIM,
  quality = 0.8
): Promise<string> {
  if (!uri) return uri;
  try {
    // Resizing by width alone keeps the aspect ratio, but would enlarge an
    // image that is already smaller than the limit - so measure first.
    const size = await measure(uri);
    // Portrait and landscape have to be constrained on different edges.
    const actions =
      size && Math.max(size.width, size.height) > maxDim
        ? [{ resize: size.width >= size.height ? { width: maxDim } : { height: maxDim } }]
        : [];

    // Even when no resize is needed, re-encoding as JPEG is worth it:
    // screenshots and PNGs are often several times larger than the same
    // picture as a JPEG. If the size could not be read, fall through to a
    // plain recompress rather than risk upscaling.
    const result = await manipulateAsync(uri, actions, {
      compress: quality,
      format: SaveFormat.JPEG,
    });
    return result.uri || uri;
  } catch {
    return uri;
  }
}
