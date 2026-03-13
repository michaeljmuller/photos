"use client";

import { useState, useEffect, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Photo, sortByDate } from "@/lib/types";

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => {
        setPhotos(sortByDate(Array.isArray(data) ? data : []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const slides = photos.map((p) => ({
    src: `/api/photos/${encodeURIComponent(p.filename)}`,
    alt: p.filename,
  }));

  const open = useCallback((i: number) => setIndex(i), []);

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center", color: "#666" }}>
        Loading photos...
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ padding: "1rem 0" }}>
        <span style={{ color: "#666", fontSize: "0.85rem" }}>{photos.length} photos</span>
      </div>
      <div className="gallery-grid">
        {photos.map((photo, i) => (
          <div key={photo.filename} className="gallery-item" onClick={() => open(i)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/photos/${encodeURIComponent(photo.filename)}/thumb`}
              alt={photo.filename}
              loading="lazy"
            />
            {photo.artist && <span className="artist-badge">{photo.artist}</span>}
          </div>
        ))}
      </div>

      <Lightbox
        open={index >= 0}
        close={() => setIndex(-1)}
        index={index}
        slides={slides}
        on={{ view: ({ index: i }) => setIndex(i) }}
      />
    </div>
  );
}
