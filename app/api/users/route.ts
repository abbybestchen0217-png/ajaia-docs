import { NextResponse } from "next/server";
import type { PublicUser } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = (await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, email: true, name: true },
  })) as PublicUser[];
  return NextResponse.json(users);
}
