import { describe, it, expect } from "vitest";
import { sortByDate, type Photo } from "../../web/lib/types";

function makePhoto(overrides: Partial<Photo> = {}): Photo {
  return {
    filename: "test.jpg",
    lat: null,
    lng: null,
    artist: null,
    date: null,
    tags: [],
    ...overrides,
  };
}

describe("sortByDate", () => {
  it("sorts newest first", () => {
    const photos = [
      makePhoto({ filename: "a.jpg", date: "2023-01-01T00:00:00.000Z" }),
      makePhoto({ filename: "b.jpg", date: "2024-06-15T00:00:00.000Z" }),
      makePhoto({ filename: "c.jpg", date: "2022-12-31T00:00:00.000Z" }),
    ];
    const sorted = sortByDate(photos);
    expect(sorted.map((p) => p.filename)).toEqual(["b.jpg", "a.jpg", "c.jpg"]);
  });

  it("pushes photos with no date to the end", () => {
    const photos = [
      makePhoto({ filename: "nodateA.jpg", date: null }),
      makePhoto({ filename: "dated.jpg", date: "2023-06-01T00:00:00.000Z" }),
      makePhoto({ filename: "nodateB.jpg", date: null }),
    ];
    const sorted = sortByDate(photos);
    expect(sorted[0].filename).toBe("dated.jpg");
    expect(sorted.slice(1).map((p) => p.filename)).toContain("nodateA.jpg");
    expect(sorted.slice(1).map((p) => p.filename)).toContain("nodateB.jpg");
  });

  it("is stable when all dates are null", () => {
    const photos = [
      makePhoto({ filename: "x.jpg" }),
      makePhoto({ filename: "y.jpg" }),
    ];
    const sorted = sortByDate(photos);
    expect(sorted).toHaveLength(2);
  });

  it("returns empty array unchanged", () => {
    expect(sortByDate([])).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const photos = [
      makePhoto({ filename: "a.jpg", date: "2024-01-01T00:00:00.000Z" }),
      makePhoto({ filename: "b.jpg", date: "2023-01-01T00:00:00.000Z" }),
    ];
    const original = [...photos];
    sortByDate(photos);
    expect(photos[0].filename).toBe(original[0].filename);
    expect(photos[1].filename).toBe(original[1].filename);
  });

  it("handles a single photo", () => {
    const photo = makePhoto({ filename: "solo.jpg", date: "2024-01-01T00:00:00.000Z" });
    expect(sortByDate([photo])).toEqual([photo]);
  });
});
