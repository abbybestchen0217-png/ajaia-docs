import { NextResponse } from "next/server";
import { pool } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function hasAccess(documentId: string, userId: string) {
  const result = await pool.query(
    `SELECT 1 FROM "Document" d
     LEFT JOIN "DocumentShare" s ON s."documentId" = d.id
     WHERE d.id = $1 AND (d."ownerId" = $2 OR s."userId" = $2)
     LIMIT 1`,
    [documentId, userId]
  );
  return result.rows.length > 0;
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const access = await hasAccess(id, userId);
    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const result = await pool.query(
      'SELECT * FROM "Document" WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const access = await hasAccess(id, userId);
    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const now = new Date().toISOString();
    const result = await pool.query(
      `UPDATE "Document" SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        "updatedAt" = $3
       WHERE id = $4 RETURNING *`,
      [body.title ?? null, body.content ?? null, now, id]
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const owner = await pool.query(
      'SELECT 1 FROM "Document" WHERE id = $1 AND "ownerId" = $2',
      [id, userId]
    );
    if (owner.rows.length === 0) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    await pool.query('DELETE FROM "DocumentShare" WHERE "documentId" = $1', [id]);
    await pool.query('DELETE FROM "Document" WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}