import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationTemplateSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const templates = await prisma.invitationTemplate.findMany({
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ data: templates });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;
  const parsed = invitationTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const baseSlug = parsed.data.name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "template";
  const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`;

  try {
    const template = await prisma.invitationTemplate.create({
      data: { ...parsed.data, slug },
    });
    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Terjadi konflik slug template. Silakan coba lagi.", 409);
    }
    throw error;
  }
}
