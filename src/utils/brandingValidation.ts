export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const FAVICON_MAX_BYTES = 512 * 1024;
export const LOGO_TARGET_ASPECT = 3; // width : height (e.g. 240×80)
export const LOGO_ASPECT_TOLERANCE = 0.35;
export const LOGO_MIN_WIDTH = 120;
export const LOGO_MAX_WIDTH = 800;
export const FAVICON_MIN_SIZE = 32;
export const FAVICON_MAX_SIZE = 512;

const LOGO_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "svg"]);
const FAVICON_EXTENSIONS = new Set(["png", "ico", "webp", "jpg", "jpeg"]);

function extension(file: File): string {
  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function loadImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions"));
    };
    img.src = url;
  });
}

export async function validateLogoFile(file: File): Promise<string | null> {
  const ext = extension(file);
  if (!LOGO_EXTENSIONS.has(ext)) {
    return "Logo must be PNG, JPG, WebP, or SVG.";
  }
  if (file.size > LOGO_MAX_BYTES) {
    return "Logo must be 2 MB or smaller.";
  }
  if (ext === "svg") {
    return null;
  }
  try {
    const { width, height } = await loadImageDimensions(file);
    if (width < LOGO_MIN_WIDTH || width > LOGO_MAX_WIDTH) {
      return `Logo width should be between ${LOGO_MIN_WIDTH}px and ${LOGO_MAX_WIDTH}px (got ${width}px).`;
    }
    const aspect = width / height;
    const minAspect = LOGO_TARGET_ASPECT * (1 - LOGO_ASPECT_TOLERANCE);
    const maxAspect = LOGO_TARGET_ASPECT * (1 + LOGO_ASPECT_TOLERANCE);
    if (aspect < minAspect || aspect > maxAspect) {
      return `Logo should use a ~3:1 aspect ratio (e.g. 240×80px). Current: ${width}×${height}px.`;
    }
  } catch {
    return "Could not validate logo image.";
  }
  return null;
}

export async function validateFaviconFile(file: File): Promise<string | null> {
  const ext = extension(file);
  if (!FAVICON_EXTENSIONS.has(ext)) {
    return "Favicon must be PNG, ICO, WebP, or JPG.";
  }
  if (file.size > FAVICON_MAX_BYTES) {
    return "Favicon must be 512 KB or smaller.";
  }
  if (ext === "ico") {
    return null;
  }
  try {
    const { width, height } = await loadImageDimensions(file);
    if (width !== height) {
      return `Favicon must be square (1:1). Current: ${width}×${height}px.`;
    }
    if (width < FAVICON_MIN_SIZE || width > FAVICON_MAX_SIZE) {
      return `Favicon should be ${FAVICON_MIN_SIZE}–${FAVICON_MAX_SIZE}px square (got ${width}px).`;
    }
  } catch {
    return "Could not validate favicon image.";
  }
  return null;
}
