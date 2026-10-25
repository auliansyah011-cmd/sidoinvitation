import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationTemplateSchema } from "@/lib/validation";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;
  const parsed = invitationTemplateSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const exists = await prisma.invitationTemplate.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) return jsonError("Template undangan tidak ditemukan.", 404);

  const template = await prisma.invitationTemplate.update({
    where: { id },
    data: parsed.data,
  });
  return NextResponse.json({ data: template });
}
