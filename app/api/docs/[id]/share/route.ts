import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: unknown }).code === "P2002"
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id: documentId } = await context.params;
  let body: { ownerUserId?: string; shareWithEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ownerUserId, shareWithEmail } = body;
  if (!ownerUserId || typeof ownerUserId !== "string") {
    return NextResponse.json({ error: "ownerUserId is required" }, { status: 400 });
  }
  if (!shareWithEmail || typeof shareWithEmail !== "string") {
    return NextResponse.json({ error: "shareWithEmail is required" }, { status: 400 });
  }

  const email = shareWithEmail.trim().toLowerCase();
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, ownerId: true },
  });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (document.ownerId !== ownerUserId) {
    return NextResponse.json({ error: "Only the document owner can share" }, { status: 403 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
  }
  if (targetUser.id === ownerUserId) {
    return NextResponse.json({ error: "Cannot share with yourself" }, { status: 400 });
  }

  try {
    const share = await prisma.documentShare.create({
      data: { documentId, userId: targetUser.id },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json(share, { status: 201 });
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return NextResponse.json({ error: "Document is already shared with this user" }, { status: 409 });
    }
    throw e;
  }
}
