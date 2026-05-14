import { NextResponse } from "next/server";
import type { DocumentListFields } from "@/lib/api-types";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const [owned, shared] = (await Promise.all([
    prisma.document.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    }),
    prisma.document.findMany({
      where: {
        ownerId: { not: userId },
        shares: { some: { userId } },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        ownerId: true,
      },
    }),
  ])) as [DocumentListFields[], DocumentListFields[]];

  const documents = [
    ...owned.map((d) => ({ ...d, isOwner: true as const })),
    ...shared.map((d) => ({ ...d, isOwner: false as const })),
  ];

  return NextResponse.json(documents);
}

export async function POST(request: Request) {
  let body: { title?: string; ownerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, ownerId } = body;
  if (!ownerId || typeof ownerId !== "string") {
    return NextResponse.json({ error: "ownerId is required" }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { id: ownerId } });
  if (!owner) {
    return NextResponse.json({ error: "Owner user not found" }, { status: 404 });
  }

  const doc = await prisma.document.create({
    data: {
      ownerId,
      title: typeof title === "string" && title.trim() ? title.trim() : "Untitled Document",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
