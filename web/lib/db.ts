import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

export interface PhotoRecord {
  filename: string;
  lat: number | null;
  lng: number | null;
  artist: string | null;
  date: string | null;
  tags: string[];
  created_at: string;
}

function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function createPhotoDb(dbPath: string) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      filename TEXT PRIMARY KEY,
      lat REAL,
      lng REAL,
      artist TEXT,
      date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: add tags column if it doesn't exist
  try {
    db.exec("ALTER TABLE photos ADD COLUMN tags TEXT");
  } catch {
    // Column already exists
  }

  return {
    db,

    upsertPhoto(photo: Omit<PhotoRecord, "created_at" | "tags">) {
      db.prepare(`
        INSERT INTO photos (filename, lat, lng, artist, date)
        VALUES (@filename, @lat, @lng, @artist, @date)
        ON CONFLICT(filename) DO UPDATE SET
          lat = COALESCE(excluded.lat, photos.lat),
          lng = COALESCE(excluded.lng, photos.lng),
          artist = COALESCE(excluded.artist, photos.artist),
          date = COALESCE(excluded.date, photos.date)
      `).run(photo);
    },

    getAllPhotos(): PhotoRecord[] {
      const rows = db.prepare("SELECT * FROM photos ORDER BY date ASC, filename ASC").all() as (Omit<PhotoRecord, "tags"> & { tags: string | null })[];
      return rows.map((r) => ({ ...r, tags: parseTags(r.tags) }));
    },

    getPhoto(filename: string): PhotoRecord | undefined {
      const row = db.prepare("SELECT * FROM photos WHERE filename = ?").get(filename) as (Omit<PhotoRecord, "tags"> & { tags: string | null }) | undefined;
      if (!row) return undefined;
      return { ...row, tags: parseTags(row.tags) };
    },

    updateArtist(filename: string, artist: string) {
      db.prepare("UPDATE photos SET artist = ? WHERE filename = ?").run(artist, filename);
    },

    updateTags(filename: string, tags: string[]) {
      db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(JSON.stringify(tags), filename);
    },

    deleteTag(tag: string) {
      const rows = db.prepare("SELECT filename, tags FROM photos").all() as { filename: string; tags: string | null }[];
      for (const row of rows) {
        const tags = parseTags(row.tags);
        if (tags.includes(tag)) {
          db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(
            JSON.stringify(tags.filter((t) => t !== tag)), row.filename
          );
        }
      }
    },

    renameTag(oldTag: string, newTag: string) {
      const rows = db.prepare("SELECT filename, tags FROM photos").all() as { filename: string; tags: string | null }[];
      for (const row of rows) {
        const tags = parseTags(row.tags);
        if (tags.includes(oldTag)) {
          const updated = [...new Set(tags.map((t) => (t === oldTag ? newTag : t)))];
          db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(JSON.stringify(updated), row.filename);
        }
      }
    },

    deletePhoto(filename: string) {
      db.prepare("DELETE FROM photos WHERE filename = ?").run(filename);
    },

    getKnownFilenames(): Set<string> {
      const rows = db.prepare("SELECT filename FROM photos").all() as { filename: string }[];
      return new Set(rows.map((r) => r.filename));
    },
  };
}

// Default application instance
const DATA_DIR = process.env.DATA_DIR || "./data";
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "photos.db");

const instance = createPhotoDb(DB_PATH);

export const upsertPhoto = instance.upsertPhoto.bind(instance);
export const getAllPhotos = instance.getAllPhotos.bind(instance);
export const getPhoto = instance.getPhoto.bind(instance);
export const updateArtist = instance.updateArtist.bind(instance);
export const updateTags = instance.updateTags.bind(instance);
export const deleteTag = instance.deleteTag.bind(instance);
export const renameTag = instance.renameTag.bind(instance);
export const deletePhoto = instance.deletePhoto.bind(instance);
export const getKnownFilenames = instance.getKnownFilenames.bind(instance);

export default instance.db;
