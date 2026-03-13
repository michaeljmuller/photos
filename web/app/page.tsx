"use client";

import { useState, useEffect, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

interface Photo {
  filename: string;
  lat: number | null;
  lng: number | null;
  artist: string | null;
  date: string | null;
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => {
        const sorted = (Array.isArray(data) ? data : []).sort((a: Photo, b: Photo) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });
        setPhotos(sorted);
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
