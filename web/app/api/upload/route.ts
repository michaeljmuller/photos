import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import { extractExif, getPhotosDir, EXIF_ORIENTATION_DEGREES } from "@/lib/photos";
import { upsertPhoto } from "@/lib/db";

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

    const photosDir = getPhotosDir();
    fs.mkdirSync(photosDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const isHeic = /\.(heic|heif)$/i.test(originalName);

    let filename: string;
    let finalBuffer: Buffer;

    if (isHeic) {
      filename = path.basename(originalName).replace(/\.(heic|heif)$/i, ".png");
      // Sharp's auto-rotate is unreliable on Alpine Linux; pass the angle explicitly.
      const heicMeta = await sharp(buffer).metadata();
      const rotateDeg = EXIF_ORIENTATION_DEGREES[heicMeta.orientation ?? 1] ?? 0;
      finalBuffer = await sharp(buffer).rotate(rotateDeg).png().toBuffer();
    } else {
      filename = path.basename(originalName);
      finalBuffer = buffer;
    }

    const destPath = path.join(photosDir, filename);
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
