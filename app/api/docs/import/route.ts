import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function isUploadedFileField(value: unknown): value is { name: string; text(): Promise<string> } {
  if (value === null || typeof value === "string") return false;
  if (typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && typeof v.text === "function";
}

function titleFromFilename(name: string) {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? name;
  return base.replace(/\.(txt|md)$/i, "").trim() || "Imported Document";
}

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const userId = formData.get("userId");
  const fileField = formData.get("file");

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId field is required" }, { status: 400 });
  }
  if (!isUploadedFileField(fileField)) {
    return NextResponse.json({ error: "file field is required" }, { status: 400 });
  }

  const name = fileField.name.toLowerCase();
  if (!name.endsWith(".txt") && !name.endsWith(".md")) {
    return NextResponse.json({ error: "Only .txt and .md files are allowed" }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { id: userId } });
  if (!owner) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const text = await fileField.text();
  const title = titleFromFilename(fileField.name);

  const document = await prisma.document.create({
    data: {
      ownerId: userId,
      title,
      content: text,
    },
  });

  return NextResponse.json(document, { status: 201 });
}
