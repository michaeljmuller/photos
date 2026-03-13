import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createPhotoDb } from "../../web/lib/db";

type Db = ReturnType<typeof createPhotoDb>;

const BASE = {
  filename: "photo.jpg",
  lat: null,
  lng: null,
  artist: null,
  date: null,
} as const;

describe("createPhotoDb", () => {
  let store: Db;

  beforeEach(() => {
    store = createPhotoDb(":memory:");
  });

  afterEach(() => {
    store.db.close();
  });

  // ── upsertPhoto ──────────────────────────────────────────────────────────

  it("inserts a new photo", () => {
    store.upsertPhoto({ ...BASE });
    const photo = store.getPhoto("photo.jpg");
    expect(photo).toBeDefined();
    expect(photo!.filename).toBe("photo.jpg");
  });

  it("stores lat/lng and date", () => {
    store.upsertPhoto({ ...BASE, lat: 48.8566, lng: 2.3522, date: "2024-06-01T00:00:00.000Z" });
    const photo = store.getPhoto("photo.jpg");
    expect(photo!.lat).toBeCloseTo(48.8566);
    expect(photo!.lng).toBeCloseTo(2.3522);
    expect(photo!.date).toBe("2024-06-01T00:00:00.000Z");
  });

  it("does not overwrite existing values with null on conflict", () => {
    store.upsertPhoto({ ...BASE, lat: 51.5, lng: -0.1, artist: "Alice" });
    // Second upsert with nulls — COALESCE should keep originals
    store.upsertPhoto({ ...BASE, lat: null, lng: null, artist: null });
    const photo = store.getPhoto("photo.jpg");
    expect(photo!.lat).toBeCloseTo(51.5);
    expect(photo!.artist).toBe("Alice");
  });

  it("overwrites existing values with non-null on conflict", () => {
    store.upsertPhoto({ ...BASE, artist: "Alice" });
    store.upsertPhoto({ ...BASE, artist: "Bob" });
    const photo = store.getPhoto("photo.jpg");
    expect(photo!.artist).toBe("Bob");
  });

  // ── getAllPhotos ─────────────────────────────────────────────────────────

  it("returns all photos", () => {
    store.upsertPhoto({ ...BASE, filename: "a.jpg" });
    store.upsertPhoto({ ...BASE, filename: "b.jpg" });
    expect(store.getAllPhotos()).toHaveLength(2);
  });

  it("returns empty array when no photos", () => {
    expect(store.getAllPhotos()).toEqual([]);
  });

  it("deserialises tags from JSON", () => {
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["landscape", "sunset"]);
    const photos = store.getAllPhotos();
    expect(photos[0].tags).toEqual(["landscape", "sunset"]);
  });

  // ── getPhoto ─────────────────────────────────────────────────────────────

  it("returns undefined for unknown filename", () => {
    expect(store.getPhoto("missing.jpg")).toBeUndefined();
  });

  it("returns empty tags array when column is null", () => {
    store.upsertPhoto({ ...BASE });
    const photo = store.getPhoto("photo.jpg");
    expect(photo!.tags).toEqual([]);
  });

  // ── updateArtist ─────────────────────────────────────────────────────────

  it("updates the artist field", () => {
    store.upsertPhoto({ ...BASE });
    store.updateArtist("photo.jpg", "Charlie");
    expect(store.getPhoto("photo.jpg")!.artist).toBe("Charlie");
  });

  // ── updateTags ───────────────────────────────────────────────────────────

  it("persists and retrieves a tags array", () => {
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["nature", "water"]);
    expect(store.getPhoto("photo.jpg")!.tags).toEqual(["nature", "water"]);
  });

  it("overwrites existing tags", () => {
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["old"]);
    store.updateTags("photo.jpg", ["new1", "new2"]);
    expect(store.getPhoto("photo.jpg")!.tags).toEqual(["new1", "new2"]);
  });

  it("persists an empty tags array", () => {
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["a"]);
    store.updateTags("photo.jpg", []);
    expect(store.getPhoto("photo.jpg")!.tags).toEqual([]);
  });

  // ── deleteTag ────────────────────────────────────────────────────────────

  it("removes the tag from all photos that have it", () => {
    store.upsertPhoto({ ...BASE, filename: "a.jpg" });
    store.upsertPhoto({ ...BASE, filename: "b.jpg" });
    store.upsertPhoto({ ...BASE, filename: "c.jpg" });
    store.updateTags("a.jpg", ["landscape", "sunset"]);
    store.updateTags("b.jpg", ["sunset", "urban"]);
    store.updateTags("c.jpg", ["urban"]);

    store.deleteTag("sunset");

    expect(store.getPhoto("a.jpg")!.tags).toEqual(["landscape"]);
    expect(store.getPhoto("b.jpg")!.tags).toEqual(["urban"]);
    expect(store.getPhoto("c.jpg")!.tags).toEqual(["urban"]); // unaffected
  });

  it("is a no-op for a tag that does not exist", () => {
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["nature"]);
    store.deleteTag("missing-tag");
    expect(store.getPhoto("photo.jpg")!.tags).toEqual(["nature"]);
  });

  // ── renameTag ────────────────────────────────────────────────────────────

  it("renames the tag across all photos", () => {
    store.upsertPhoto({ ...BASE, filename: "a.jpg" });
    store.upsertPhoto({ ...BASE, filename: "b.jpg" });
    store.updateTags("a.jpg", ["old-name", "other"]);
    store.updateTags("b.jpg", ["old-name"]);

    store.renameTag("old-name", "new-name");

    expect(store.getPhoto("a.jpg")!.tags).toEqual(["new-name", "other"]);
    expect(store.getPhoto("b.jpg")!.tags).toEqual(["new-name"]);
  });

  it("deduplicates when the photo already has the target tag name", () => {
    // Photo has ["alpha", "beta"]. Renaming "alpha" → "beta" should leave just ["beta"].
    store.upsertPhoto({ ...BASE });
    store.updateTags("photo.jpg", ["alpha", "beta"]);

    store.renameTag("alpha", "beta");

    expect(store.getPhoto("photo.jpg")!.tags).toEqual(["beta"]);
  });

  it("does not touch photos that lack the old tag", () => {
    store.upsertPhoto({ ...BASE, filename: "a.jpg" });
    store.upsertPhoto({ ...BASE, filename: "b.jpg" });
    store.updateTags("a.jpg", ["x"]);
    store.updateTags("b.jpg", ["y"]);

    store.renameTag("x", "z");

    expect(store.getPhoto("b.jpg")!.tags).toEqual(["y"]);
  });

  // ── deletePhoto ──────────────────────────────────────────────────────────

  it("removes the photo record", () => {
    store.upsertPhoto({ ...BASE });
    store.deletePhoto("photo.jpg");
    expect(store.getPhoto("photo.jpg")).toBeUndefined();
  });

  it("is a no-op for a nonexistent photo", () => {
    expect(() => store.deletePhoto("ghost.jpg")).not.toThrow();
  });

  // ── getKnownFilenames ────────────────────────────────────────────────────

  it("returns a set of all filenames", () => {
    store.upsertPhoto({ ...BASE, filename: "x.jpg" });
    store.upsertPhoto({ ...BASE, filename: "y.jpg" });
    const known = store.getKnownFilenames();
    expect(known.has("x.jpg")).toBe(true);
    expect(known.has("y.jpg")).toBe(true);
    expect(known.size).toBe(2);
  });

  it("returns an empty set when no photos exist", () => {
    expect(store.getKnownFilenames().size).toBe(0);
  });
});
