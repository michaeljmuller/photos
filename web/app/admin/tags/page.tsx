"use client";

import { useState, useEffect, useCallback, KeyboardEvent } from "react";
import { Photo } from "@/lib/types";

export default function TagsAdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const [renameError, setRenameError] = useState("");
  const [confirmDeleteTag, setConfirmDeleteTag] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([fetch("/api/photos").then((r) => r.json()), fetch("/api/tags").then((r) => r.json())])
      .then(([photoData, tagData]) => {
        setPhotos(Array.isArray(photoData) ? photoData : []);
        setAllTags(Array.isArray(tagData) ? tagData : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleTag(photo: Photo, tag: string) {
    const hasTag = photo.tags.includes(tag);
    const newTags = hasTag ? photo.tags.filter((t) => t !== tag) : [...photo.tags, tag];
    setSaving((s) => ({ ...s, [photo.filename]: true }));
    const res = await fetch(`/api/photos/${encodeURIComponent(photo.filename)}/tags`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: newTags }),
    });
    if (res.ok) {
      setPhotos((prev) => prev.map((p) => p.filename === photo.filename ? { ...p, tags: newTags } : p));
    }
    setSaving((s) => ({ ...s, [photo.filename]: false }));
  }

  function createTag() {
    const tag = newTagInput.trim();
    if (!tag || allTags.includes(tag)) return;
    setAllTags((prev) => [...prev, tag].sort());
    setSelectedTag(tag);
    setNewTagInput("");
  }

  function startRename(tag: string) {
    setRenamingTag(tag);
    setRenameInput(tag);
    setRenameError("");
    setConfirmDeleteTag(null);
  }

  async function commitRename(oldTag: string) {
    const newName = renameInput.trim();
    if (!newName || newName === oldTag) { setRenamingTag(null); return; }
    if (allTags.includes(newName)) {
      setRenameError(`"${newName}" already exists`);
      return;
    }
    const res = await fetch(`/api/tags/${encodeURIComponent(oldTag)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setAllTags((prev) => prev.map((t) => t === oldTag ? newName : t).sort());
      setPhotos((prev) => prev.map((p) => ({
        ...p,
        tags: p.tags.map((t) => t === oldTag ? newName : t),
      })));
      if (selectedTag === oldTag) setSelectedTag(newName);
    }
    setRenamingTag(null);
    setRenameError("");
  }

  async function doDeleteTag(tag: string) {
    const res = await fetch(`/api/tags/${encodeURIComponent(tag)}`, { method: "DELETE" });
    if (res.ok) {
      setAllTags((prev) => prev.filter((t) => t !== tag));
      setPhotos((prev) => prev.map((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) })));
      if (selectedTag === tag) setSelectedTag(null);
    }
    setConfirmDeleteTag(null);
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center", color: "#666" }}>
        Loading...
      </div>
    );
  }

  const btnBase: React.CSSProperties = {
    background: "none", border: "none", cursor: "pointer", padding: "0 4px",
    fontSize: "0.8rem", lineHeight: 1,
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Tags</h1>
      </div>

      <div style={{ display: "flex", gap: "2rem", alignItems: "flex-start" }}>
        {/* Tag sidebar */}
        <div style={{ minWidth: "200px", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: "6px", marginBottom: "1rem" }}>
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTag()}
              placeholder="New tag…"
              style={{ flex: 1, minWidth: 0 }}
            />
            <button className="btn btn-sm btn-primary" onClick={createTag} style={{ flexShrink: 0, width: "auto", marginTop: 0 }}>+</button>
          </div>

          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {allTags.map((tag) => (
              <li key={tag} style={{ marginBottom: "2px" }}>
                {renamingTag === tag ? (
                  <div style={{ padding: "0.25rem 0.5rem" }}>
                    <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      <input
                        type="text"
                        value={renameInput}
                        autoFocus
                        onChange={(e) => { setRenameInput(e.target.value); setRenameError(""); }}
                        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === "Enter") commitRename(tag);
                          if (e.key === "Escape") setRenamingTag(null);
                        }}
                        style={{ flex: 1, minWidth: 0 }}
                      />
                      <button onClick={() => commitRename(tag)} style={{ ...btnBase, color: "#6c8ebf" }}>✓</button>
                      <button onClick={() => setRenamingTag(null)} style={{ ...btnBase, color: "#666" }}>✕</button>
                    </div>
                    {renameError && <div style={{ color: "#e05252", fontSize: "0.75rem", marginTop: "2px" }}>{renameError}</div>}
                  </div>
                ) : confirmDeleteTag === tag ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>
                    <span style={{ color: "#aaa", flex: 1 }}>Delete "{tag}"?</span>
                    <button onClick={() => doDeleteTag(tag)} style={{ ...btnBase, color: "#e05252" }}>✓</button>
                    <button onClick={() => setConfirmDeleteTag(null)} style={{ ...btnBase, color: "#666" }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: tag === selectedTag ? "#2a2a2a" : "none",
                        border: "none",
                        borderLeft: `3px solid ${tag === selectedTag ? "#6c8ebf" : "transparent"}`,
                        color: tag === selectedTag ? "#fff" : "#aaa",
                        padding: "0.4rem 0.75rem",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        borderRadius: "0 4px 4px 0",
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tag}
                      <span style={{ float: "right", fontSize: "0.75rem", color: "#666", marginLeft: "4px" }}>
                        {photos.filter((p) => p.tags.includes(tag)).length}
                      </span>
                    </button>
                    <button onClick={() => startRename(tag)} style={{ ...btnBase, color: "#666" }} title="Rename">✎</button>
                    <button onClick={() => { setConfirmDeleteTag(tag); setRenamingTag(null); }} style={{ ...btnBase, color: "#664" }} title="Delete">×</button>
                  </div>
                )}
              </li>
            ))}
          </ul>

          {allTags.length === 0 && (
            <p style={{ color: "#555", fontSize: "0.85rem" }}>No tags yet.</p>
          )}
        </div>

        {/* Photo grid */}
        <div style={{ flex: 1 }}>
          {!selectedTag ? (
            <p style={{ color: "#555", paddingTop: "0.5rem" }}>Select a tag to assign it to photos.</p>
          ) : (
            <>
              <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "1rem" }}>
                Checking a photo adds the tag <strong style={{ color: "#ccc" }}>{selectedTag}</strong> to it.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
                {photos.map((photo) => {
                  const checked = photo.tags.includes(selectedTag);
                  return (
                    <label
                      key={photo.filename}
                      style={{
                        position: "relative",
                        cursor: saving[photo.filename] ? "wait" : "pointer",
                        borderRadius: "6px",
                        overflow: "hidden",
                        border: checked ? "2px solid #6c8ebf" : "2px solid transparent",
                        opacity: saving[photo.filename] ? 0.6 : 1,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/photos/${encodeURIComponent(photo.filename)}/thumb`}
                        alt={photo.filename}
                        style={{ width: "100%", display: "block", aspectRatio: "1", objectFit: "cover" }}
                      />
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving[photo.filename]}
                        onChange={() => toggleTag(photo, selectedTag)}
                        style={{ position: "absolute", top: "6px", left: "6px", width: "18px", height: "18px", cursor: "pointer" }}
                      />
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
