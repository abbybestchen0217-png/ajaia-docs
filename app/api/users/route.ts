import { NextResponse } from "next/server";
import { pool } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await pool.query(
      'SELECT id, email, name FROM "User" ORDER BY name'
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}