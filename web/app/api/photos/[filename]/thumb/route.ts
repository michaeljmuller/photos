import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { generateThumbnail } from "@/lib/photos";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = path.basename(filename);

  if (!/\.(png|jpe?g)$/i.test(safe)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const buffer = await generateThumbnail(safe);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Thumbnail error:", err);
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
  }
}
