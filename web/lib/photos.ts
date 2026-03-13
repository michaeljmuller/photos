import path from "path";
import fs from "fs";
import { upsertPhoto, getKnownFilenames } from "./db";

const PHOTOS_DIR = process.env.PHOTOS_DIR || "./photos";

// Maps EXIF orientation tag values to explicit rotation degrees.
// Sharp's auto-rotate is unreliable on Alpine Linux (musl libc).
export const EXIF_ORIENTATION_DEGREES: Record<number, number> = { 1: 0, 3: 180, 6: 90, 8: 270 };
const DATA_DIR = process.env.DATA_DIR || "./data";
const THUMBS_DIR = path.join(DATA_DIR, "thumbs");

export function getPhotosDir() {
  return PHOTOS_DIR;
}

export function getThumbsDir() {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });
  return THUMBS_DIR;
}

export function listPhotoFiles(): string[] {
  try {
    return fs
      .readdirSync(PHOTOS_DIR)
      .filter((f) => /\.(png|jpe?g)$/i.test(f))
      .sort();
  } catch {
    return [];
  }
}

export async function extractExif(filePath: string | Buffer): Promise<{
  lat: number | null;
  lng: number | null;
  date: string | null;
}> {
  try {
    // Dynamic import to avoid SSR issues
    const exifr = await import("exifr");
    const result = await exifr.default.gps(filePath);
    let date: string | null = null;

    try {
      const full = await exifr.default.parse(filePath, {
        pick: ["DateTimeOriginal", "CreateDate"],
      });
      if (full?.DateTimeOriginal) {
        date = full.DateTimeOriginal instanceof Date
          ? full.DateTimeOriginal.toISOString()
          : String(full.DateTimeOriginal);
      } else if (full?.CreateDate) {
        date = full.CreateDate instanceof Date
          ? full.CreateDate.toISOString()
          : String(full.CreateDate);
      }
    } catch {
      // date extraction failed, leave as null
    }

    if (result && typeof result.latitude === "number" && typeof result.longitude === "number") {
      return { lat: result.latitude, lng: result.longitude, date };
    }
    return { lat: null, lng: null, date };
  } catch {
    return { lat: null, lng: null, date: null };
  }
}

export async function syncPhotosToDb() {
  const files = listPhotoFiles();
  const known = getKnownFilenames();
  const newFiles = files.filter((f) => !known.has(f));

  for (const filename of newFiles) {
    const filePath = path.join(PHOTOS_DIR, filename);
    const { lat, lng, date } = await extractExif(filePath);
    upsertPhoto({ filename, lat, lng, artist: null, date });
  }
}

export async function generateThumbnail(filename: string): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const sourcePath = path.join(PHOTOS_DIR, filename);
  const thumbPath = path.join(getThumbsDir(), filename.replace(/\.[^.]+$/, ".webp"));

  // Check cache
  if (fs.existsSync(thumbPath)) {
    return fs.readFileSync(thumbPath);
  }

  const meta = await sharp(sourcePath).metadata();
  const rotateDeg = EXIF_ORIENTATION_DEGREES[meta.orientation ?? 1] ?? 0;

  const buffer = await sharp(sourcePath)
    .rotate(rotateDeg)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  fs.writeFileSync(thumbPath, buffer);
  return buffer;
}
