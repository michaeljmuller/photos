import { NextRequest, NextResponse } from "next/server";
import { deleteTag, renameTag } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  deleteTag(decoded);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const { name } = await request.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  renameTag(decoded, name.trim());
  return NextResponse.json({ ok: true });
}
