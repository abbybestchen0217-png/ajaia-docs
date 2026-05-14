import { NextResponse } from "next/server";
import { pool } from "@/lib/prisma";
import { randomBytes } from "crypto";

function cuid() {
  return randomBytes(16).toString("hex");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }
  try {
    const owned = await pool.query(
      'SELECT * FROM "Document" WHERE "ownerId" = $1 ORDER BY "updatedAt" DESC',
      [userId]
    );
    const shared = await pool.query(
      `SELECT d.* FROM "Document" d
       INNER JOIN "DocumentShare" s ON s."documentId" = d.id
       WHERE s."userId" = $1 ORDER BY d."updatedAt" DESC`,
      [userId]
    );
    const ownedWithFlag = owned.rows.map((d) => ({ ...d, isOwner: true }));
    const sharedWithFlag = shared.rows.map((d) => ({ ...d, isOwner: false }));
    return NextResponse.json([...ownedWithFlag, ...sharedWithFlag]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, ownerId } = await request.json();
    if (!ownerId) {
      return NextResponse.json({ error: "ownerId required" }, { status: 400 });
    }
    const id = cuid();
    const now = new Date().toISOString();
    const result = await pool.query(
      `INSERT INTO "Document" (id, title, content, "createdAt", "updatedAt", "ownerId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, title || "Untitled Document", "", now, now, ownerId]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create document" }, { status: 500 });
  }
}