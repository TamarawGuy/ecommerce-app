// Product imagery is stored as bare Unsplash photo URLs (no size params); we
// request a width here so lists pull small images and detail pulls full-res,
// keeping scrolling fast. `auto=format` serves WebP/AVIF where the client allows.

/**
 * Builds a sized Unsplash URL from a stored bare photo URL, or `undefined` when
 * there is no image (so `expo-image` falls back to its placeholder).
 */
export function sizedImage(
  base: string | null | undefined,
  width: number,
  quality = 70
): string | undefined {
  if (!base) return undefined;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}auto=format&fit=crop&w=${width}&q=${quality}`;
}
