import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { updateTags, getPhoto } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = path.basename(filename);

  const existing = getPhoto(safe);
  if (!existing) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  try {
    const { tags } = await request.json();
    if (!Array.isArray(tags) || !tags.every((t) => typeof t === "string")) {
      return NextResponse.json({ error: "Invalid tags" }, { status: 400 });
    }
    updateTags(safe, tags.map((t: string) => t.trim()).filter(Boolean));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
