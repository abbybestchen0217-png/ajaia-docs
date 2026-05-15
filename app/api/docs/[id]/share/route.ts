import { NextResponse } from "next/server";
import { pool } from "@/lib/prisma";
import { randomBytes } from "crypto";

function cuid() {
  return randomBytes(16).toString("hex");
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  try {
    const { ownerUserId, shareWithEmail } = await request.json();
    if (!ownerUserId || !shareWithEmail) {
      return NextResponse.json({ error: "ownerUserId and shareWithEmail required" }, { status: 400 });
    }
    const owner = await pool.query(
      'SELECT 1 FROM "Document" WHERE id = $1 AND "ownerId" = $2',
      [id, ownerUserId]
    );
    if (owner.rows.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    const userResult = await pool.query(
      'SELECT id FROM "User" WHERE email = $1',
      [shareWithEmail]
    );
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const shareUserId = userResult.rows[0].id;
    if (shareUserId === ownerUserId) {
      return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
    }
    const existing = await pool.query(
      'SELECT 1 FROM "DocumentShare" WHERE "documentId" = $1 AND "userId" = $2',
      [id, shareUserId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Already shared" }, { status: 400 });
    }
    const shareId = cuid();
    const now = new Date().toISOString();
    await pool.query(
      'INSERT INTO "DocumentShare" (id, "documentId", "userId", "createdAt") VALUES ($1, $2, $3, $4)',
      [shareId, id, shareUserId, now]
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to share document" }, { status: 500 });
  }
}