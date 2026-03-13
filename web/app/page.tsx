"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Photo, sortByDate } from "@/lib/types";
import { useEffect } from "react";

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState<string | null>(() => searchParams.get("tag"));
  const [index, setIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/photos").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([photoData, tagData]) => {
      setPhotos(sortByDate(Array.isArray(photoData) ? photoData : []));
      setAllTags(Array.isArray(tagData) ? tagData : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectTag = useCallback((tag: string | null) => {
    setActiveTag(tag);
    if (tag) {
      router.replace(`/?tag=${encodeURIComponent(tag)}`);
    } else {
      router.replace("/");
    }
  }, [router]);

  const visible = activeTag
    ? photos.filter((p) => p.tags.includes(activeTag))
    : photos;

  const slides = visible.map((p) => ({
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
      <div style={{ padding: "1rem 0", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ color: "#666", fontSize: "0.85rem", marginRight: "0.5rem" }}>{visible.length} photos</span>
        {allTags.length > 0 && (
          <>
            <button
              onClick={() => selectTag(null)}
              style={{
                background: activeTag === null ? "#4a9eff" : "#1a1a1a",
                color: activeTag === null ? "#fff" : "#aaa",
                border: "1px solid",
                borderColor: activeTag === null ? "#4a9eff" : "#333",
                borderRadius: "999px",
                padding: "2px 12px",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => selectTag(activeTag === tag ? null : tag)}
                style={{
                  background: activeTag === tag ? "#4a9eff" : "#1a1a1a",
                  color: activeTag === tag ? "#fff" : "#aaa",
                  border: "1px solid",
                  borderColor: activeTag === tag ? "#4a9eff" : "#333",
                  borderRadius: "999px",
                  padding: "2px 12px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </>
        )}
      </div>

      <div className="gallery-grid">
        {visible.map((photo, i) => (
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

export default function GalleryPage() {
  return (
    <Suspense
      fallback={
        <div className="container" style={{ paddingTop: "4rem", textAlign: "center", color: "#666" }}>
          Loading photos...
        </div>
      }
    >
      <GalleryContent />
    </Suspense>
  );
}
