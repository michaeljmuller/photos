"use client";

import { useState, useEffect, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { Photo, sortByDate } from "@/lib/types";

export default function AdminPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMsg, setUploadMsg] = useState("");
  const [artistEdits, setArtistEdits] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPhotos = useCallback(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => {
        const list = sortByDate(Array.isArray(data) ? data : []);
        setPhotos(list);
        const artistInit: Record<string, string> = {};
        const savedInit: Record<string, string> = {};
        list.forEach((p: Photo) => {
          artistInit[p.filename] = p.artist || "";
          savedInit[p.filename] = p.artist || "";
        });
        setArtistEdits(artistInit);
        setSaved(savedInit);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  async function uploadFile(file: File) {
    if (!/\.(png|jpe?g|heic|heif)$/i.test(file.name)) {
      setUploadMsg("Only PNG, JPEG, and HEIC files are allowed.");
      return;
    }
    setUploading(true);
    setUploadMsg("");
    const form = new FormData();
    form.append("photo", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      setUploadMsg(`Uploaded ${file.name} successfully.`);
      loadPhotos();
    } else {
      const data = await res.json();
      setUploadMsg(`Upload failed: ${data.error}`);
    }
    setUploading(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(uploadFile);
    e.target.value = "";
  }

  function hasChanges(filename: string) {
    return saved[filename] !== (artistEdits[filename] ?? "");
  }

  async function deletePhoto(filename: string) {
    setDeleting((s) => ({ ...s, [filename]: true }));
    const res = await fetch(`/api/photos/${encodeURIComponent(filename)}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.filename !== filename));
      setConfirmDelete(null);
    }
    setDeleting((s) => ({ ...s, [filename]: false }));
  }

  async function saveMeta(filename: string) {
    const artist = artistEdits[filename] ?? "";
    setSaving((s) => ({ ...s, [filename]: true }));
    const res = await fetch(`/api/photos/${encodeURIComponent(filename)}/meta`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artist, tags: photos.find((p) => p.filename === filename)?.tags ?? [] }),
    });
    if (res.ok) {
      setSaved((s) => ({ ...s, [filename]: artist }));
    }
    setSaving((s) => ({ ...s, [filename]: false }));
  }

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "4rem", textAlign: "center", color: "#666" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>Admin</h1>
        <span style={{ color: "#666", fontSize: "0.85rem" }}>{photos.length} photos</span>
      </div>

      {/* Upload zone */}
      <div
        className={`drop-zone${dragActive ? " active" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.heic,.heif"
          multiple
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <div style={{ fontSize: "2rem" }}>📷</div>
        <p>{uploading ? "Uploading..." : "Drag & drop photos here, or click to select"}</p>
        <p style={{ fontSize: "0.8rem" }}>PNG, JPEG, HEIC</p>
      </div>

      {uploadMsg && (
        <p style={{ marginBottom: "1rem", color: uploadMsg.includes("failed") ? "#e05252" : "#52d652" }}>
          {uploadMsg}
        </p>
      )}

      {/* Photos table */}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Photo</th>
            <th>Filename</th>
            <th>GPS</th>
            <th>Date</th>
            <th>Artist</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {photos.map((photo) => (
            <tr key={photo.filename}>
              <td>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${encodeURIComponent(photo.filename)}/thumb`}
                  alt={photo.filename}
                />
              </td>
              <td style={{ color: "#888", fontSize: "0.8rem" }}>{photo.filename}</td>
              <td style={{ fontSize: "0.75rem", color: "#666" }}>
                {photo.lat !== null ? `${photo.lat.toFixed(4)}, ${photo.lng!.toFixed(4)}` : "—"}
              </td>
              <td style={{ fontSize: "0.75rem", color: "#666" }}>
                {photo.date ? new Date(photo.date).toLocaleDateString() : "—"}
              </td>
              <td>
                <input
                  type="text"
                  value={artistEdits[photo.filename] ?? ""}
                  onChange={(e) =>
                    setArtistEdits((prev) => ({ ...prev, [photo.filename]: e.target.value }))
                  }
                  placeholder="Artist name"
                  onKeyDown={(e) => e.key === "Enter" && saveMeta(photo.filename)}
                />
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {(hasChanges(photo.filename) || saving[photo.filename]) && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => saveMeta(photo.filename)}
                    disabled={saving[photo.filename]}
                    style={{ marginRight: "6px" }}
                  >
                    {saving[photo.filename] ? "..." : "Save"}
                  </button>
                )}
                {confirmDelete === photo.filename ? (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => deletePhoto(photo.filename)}
                      disabled={deleting[photo.filename]}
                      style={{ background: "#8b2020", color: "#fff", marginRight: "4px" }}
                    >
                      {deleting[photo.filename] ? "..." : "Confirm"}
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => setConfirmDelete(null)}
                      style={{ background: "#333", color: "#aaa" }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-sm"
                    onClick={() => setConfirmDelete(photo.filename)}
                    style={{ background: "none", border: "1px solid #555", color: "#888" }}
                  >
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
