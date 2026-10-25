import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const updateUserSchema = z.object({ disabled: z.boolean() });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const user = await prisma.user.findFirst({
    where: { id, role: "USER" },
    select: { id: true, disabledAt: true },
  });
  if (!user) return jsonError("User tidak ditemukan.", 404);

  const disabledAt = parsed.data.disabled ? user.disabledAt ?? new Date() : null;
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({
      where: { id },
      data: { disabledAt },
      select: { id: true, name: true, email: true, disabledAt: true },
    });
    await tx.activityLog.create({
      data: {
        userId: id,
        type: parsed.data.disabled ? "USER_DISABLED" : "USER_ENABLED",
        metadata: { changedBy: auth.user!.id },
      },
    });
    return result;
  });

  return NextResponse.json({ data: updated });
}
