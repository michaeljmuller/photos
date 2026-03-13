"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default icon paths for webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Photo {
  filename: string;
  lat: number | null;
  lng: number | null;
  artist: string | null;
  date: string | null;
}

function FitBounds({ photos }: { photos: Photo[] }) {
  const map = useMap();
  useEffect(() => {
    if (photos.length === 0) return;
    const bounds = L.latLngBounds(photos.map((p) => [p.lat!, p.lng!]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, photos]);
  return null;
}

export default function MapView() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/photos")
      .then((r) => r.json())
      .then((data) => {
        setPhotos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const geoPhotos = photos.filter((p) => p.lat !== null && p.lng !== null);

  const center: [number, number] = [20, 0];

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 56px)", color: "#666" }}>
        Loading map...
      </div>
    );
  }

  return (
    <div className="map-container">
      <MapContainer center={center} zoom={2} style={{ height: "100%", width: "100%" }}>
        {geoPhotos.length > 0 && <FitBounds photos={geoPhotos} />}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geoPhotos.map((photo) => (
          <Marker key={photo.filename} position={[photo.lat!, photo.lng!]} icon={icon}>
            <Popup>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${encodeURIComponent(photo.filename)}/thumb`}
                alt={photo.filename}
              />
              <a href={`/api/photos/${encodeURIComponent(photo.filename)}`} target="_blank" rel="noopener noreferrer">
                View full photo
              </a>
              {photo.artist && <p>Artist: {photo.artist}</p>}
              {photo.date && <p>{new Date(photo.date).toLocaleDateString()}</p>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div style={{ position: "absolute", top: "70px", right: "10px", zIndex: 1000, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "6px 12px", borderRadius: "6px", fontSize: "0.8rem" }}>
        {geoPhotos.length} / {photos.length} photos with GPS
      </div>
    </div>
  );
}
