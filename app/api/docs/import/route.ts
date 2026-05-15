import { NextResponse } from "next/server";
import { pool } from "@/lib/prisma";
import { randomBytes } from "crypto";

function cuid() {
  return randomBytes(16).toString("hex");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "file and userId required" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext !== "txt" && ext !== "md") {
      return NextResponse.json({ error: "Only .txt and .md files are supported" }, { status: 400 });
    }

    const text = await file.text();
    const title = fileName.replace(/\.(txt|md)$/, "");
    const id = cuid();
    const now = new Date().toISOString();

    const result = await pool.query(
      `INSERT INTO "Document" (id, title, content, "createdAt", "updatedAt", "ownerId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, title, text, now, now, userId]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to import file" }, { status: 500 });
  }
}