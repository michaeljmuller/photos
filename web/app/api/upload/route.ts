import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { extractExif } from "@/lib/photos";
import { upsertPhoto } from "@/lib/db";

const PHOTOS_DIR = process.env.PHOTOS_DIR || "./photos";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const originalName = file.name;
    if (!/\.(png|jpe?g|heic|heif)$/i.test(originalName)) {
      return NextResponse.json({ error: "Only PNG, JPEG, and HEIC files are allowed" }, { status: 400 });
    }

    // Ensure photos dir exists
    fs.mkdirSync(PHOTOS_DIR, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const isHeic = /\.(heic|heif)$/i.test(originalName);

    let filename: string;
    let destPath: string;
    let finalBuffer: Buffer;

    if (isHeic) {
      filename = path.basename(originalName).replace(/\.(heic|heif)$/i, ".png");
      destPath = path.join(PHOTOS_DIR, filename);

      // exifr reliably reads HEIC orientation; sharp's auto-rotate is not
      // consistent with libheif on Alpine, so we pass the angle explicitly.
      const orientationDegrees: Record<number, number> = { 1: 0, 3: 180, 6: 90, 8: 270 };
      const heicMeta = await sharp(buffer).metadata();
      const heicRotate = orientationDegrees[heicMeta.orientation ?? 1] ?? 0;
      finalBuffer = await sharp(buffer).rotate(heicRotate).png().toBuffer();
    } else {
      filename = path.basename(originalName);
      destPath = path.join(PHOTOS_DIR, filename);
      finalBuffer = buffer;
    }

    fs.writeFileSync(destPath, finalBuffer);

    const { lat, lng, date } = await extractExif(isHeic ? buffer : destPath);
    upsertPhoto({ filename, lat, lng, artist: null, date });

    return NextResponse.json({ ok: true, filename });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
