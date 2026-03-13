import { NextResponse } from "next/server";
import { getAllPhotos } from "@/lib/db";
import { syncPhotosToDb } from "@/lib/photos";

export async function GET() {
  try {
    await syncPhotosToDb();
    const photos = getAllPhotos();
    return NextResponse.json(photos);
  } catch (err) {
    console.error("Error fetching photos:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
