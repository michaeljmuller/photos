import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { deletePhoto } from "@/lib/db";

const PHOTOS_DIR = process.env.PHOTOS_DIR || "./photos";
const DATA_DIR = process.env.DATA_DIR || "./data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Sanitize filename
  const safe = path.basename(filename);
  if (!/\.(png|jpe?g)$/i.test(safe)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(PHOTOS_DIR, safe);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(safe).toLowerCase();
  const contentType = ext === ".png" ? "image/png" : "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = path.basename(filename);
  if (!/\.(png|jpe?g)$/i.test(safe)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const filePath = path.join(PHOTOS_DIR, safe);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  fs.rmSync(filePath);
  const thumbPath = path.join(DATA_DIR, "thumbs", safe.replace(/\.[^.]+$/, ".webp"));
  if (fs.existsSync(thumbPath)) fs.rmSync(thumbPath);
  deletePhoto(safe);

  return NextResponse.json({ ok: true });
}
