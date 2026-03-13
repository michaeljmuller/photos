export interface Photo {
  filename: string;
  lat: number | null;
  lng: number | null;
  artist: string | null;
  date: string | null;
  tags: string[];
}

export function sortByDate(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
