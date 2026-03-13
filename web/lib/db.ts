import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || "./data";

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "photos.db");

const db = new Database(DB_PATH);

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

export function upsertPhoto(photo: Omit<PhotoRecord, "created_at" | "tags">) {
  db.prepare(`
    INSERT INTO photos (filename, lat, lng, artist, date)
    VALUES (@filename, @lat, @lng, @artist, @date)
    ON CONFLICT(filename) DO UPDATE SET
      lat = COALESCE(excluded.lat, photos.lat),
      lng = COALESCE(excluded.lng, photos.lng),
      artist = COALESCE(excluded.artist, photos.artist),
      date = COALESCE(excluded.date, photos.date)
  `).run(photo);
}

export function getAllPhotos(): PhotoRecord[] {
  const rows = db.prepare("SELECT * FROM photos ORDER BY date ASC, filename ASC").all() as (Omit<PhotoRecord, "tags"> & { tags: string | null })[];
  return rows.map((r) => ({ ...r, tags: parseTags(r.tags) }));
}

export function getPhoto(filename: string): PhotoRecord | undefined {
  const row = db.prepare("SELECT * FROM photos WHERE filename = ?").get(filename) as (Omit<PhotoRecord, "tags"> & { tags: string | null }) | undefined;
  if (!row) return undefined;
  return { ...row, tags: parseTags(row.tags) };
}

export function updateArtist(filename: string, artist: string) {
  db.prepare("UPDATE photos SET artist = ? WHERE filename = ?").run(artist, filename);
}

export function updateTags(filename: string, tags: string[]) {
  db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(JSON.stringify(tags), filename);
}

export function deleteTag(tag: string) {
  const rows = db.prepare("SELECT filename, tags FROM photos").all() as { filename: string; tags: string | null }[];
  for (const row of rows) {
    const tags = parseTags(row.tags);
    if (tags.includes(tag)) {
      db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(
        JSON.stringify(tags.filter((t) => t !== tag)), row.filename
      );
    }
  }
}

export function renameTag(oldTag: string, newTag: string) {
  const rows = db.prepare("SELECT filename, tags FROM photos").all() as { filename: string; tags: string | null }[];
  for (const row of rows) {
    const tags = parseTags(row.tags);
    if (tags.includes(oldTag)) {
      const updated = [...new Set(tags.map((t) => (t === oldTag ? newTag : t)))];
      db.prepare("UPDATE photos SET tags = ? WHERE filename = ?").run(JSON.stringify(updated), row.filename);
    }
  }
}

export function deletePhoto(filename: string) {
  db.prepare("DELETE FROM photos WHERE filename = ?").run(filename);
}

export function getKnownFilenames(): Set<string> {
  const rows = db.prepare("SELECT filename FROM photos").all() as { filename: string }[];
  return new Set(rows.map((r) => r.filename));
}

export default db;
