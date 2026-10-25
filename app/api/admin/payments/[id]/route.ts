import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const reviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { id: true, status: true, proofPath: true, userId: true, invitationId: true },
  });
  if (!payment) return jsonError("Pembayaran tidak ditemukan.", 404);
  if (payment.status !== "AWAITING_REVIEW" || !payment.proofPath) {
    return jsonError("Pembayaran tidak sedang menunggu verifikasi.", 409);
  }

  const approved = parsed.data.decision === "approve";
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: { id: payment.id, status: "AWAITING_REVIEW" },
      data: {
        status: approved ? "PAID" : "REJECTED",
        paidAt: approved ? new Date() : null,
        reviewedAt: new Date(),
        reviewedById: auth.user!.id,
      },
    });
    if (!result.count) return false;

    if (approved) {
      await tx.user.update({
        where: { id: payment.userId },
        data: { isActive: true },
      });
      await tx.invitation.update({
        where: { id: payment.invitationId },
        data: { status: "PUBLISHED" },
      });
    }

    await tx.activityLog.create({
      data: {
        userId: payment.userId,
        type: approved ? "PAYMENT_PAID" : "PAYMENT_REJECTED",
        metadata: {
          paymentId: payment.id,
          invitationId: payment.invitationId,
          reviewedBy: auth.user!.id,
        },
      },
    });
    return true;
  });
  if (!updated) return jsonError("Pembayaran baru saja ditinjau oleh admin lain.", 409);

  return NextResponse.json({
    message: approved
      ? "Pembayaran disetujui; akun dan undangan sudah diaktifkan."
      : "Bukti ditolak. User dapat mengirim bukti baru.",
    status: approved ? "PAID" : "REJECTED",
  });
}
