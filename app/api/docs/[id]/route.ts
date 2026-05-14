import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function userHasDocumentAccess(documentId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      id: documentId,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    select: { id: true, ownerId: true },
  });
  return doc;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const access = await userHasDocumentAccess(id, userId);
  if (!access) {
    return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
  }

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  return NextResponse.json({ ...document, isOwner: document.ownerId === userId });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const access = await userHasDocumentAccess(id, userId);
  if (!access) {
    return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 });
  }

  const data: { title?: string; content?: string } = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.content === "string") data.content = body.content;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Provide title and/or content" }, { status: 400 });
  }

  const document = await prisma.document.update({
    where: { id },
    data,
  });

  return NextResponse.json(document);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId query parameter" }, { status: 400 });
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (doc.ownerId !== userId) {
    return NextResponse.json({ error: "Only the owner can delete this document" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
