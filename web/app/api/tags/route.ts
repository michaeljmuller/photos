import { NextResponse } from "next/server";
import { getAllPhotos } from "@/lib/db";

export async function GET() {
  const photos = getAllPhotos();
  const tagSet = new Set<string>();
  photos.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
  return NextResponse.json([...tagSet].sort());
}
