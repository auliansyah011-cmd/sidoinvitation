import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  deletePaymentProof,
  uploadPaymentProof,
  validatePaymentStorageConfiguration,
  validateProofFile,
} from "@/lib/payment-storage";
import { prisma } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const { id } = await params;
  const payment = await prisma.payment.findFirst({
    where: { id, userId: auth.user.id },
    select: {
      id: true,
      status: true,
      proofPath: true,
      invitationId: true,
    },
  });
  if (!payment) return jsonError("Pembayaran tidak ditemukan.", 404);
  if (!["PENDING", "REJECTED"].includes(payment.status)) {
    return jsonError("Bukti hanya dapat dikirim untuk pembayaran baru atau yang ditolak.", 409);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("Request harus berupa multipart form-data.", 400);
  }
  const file = formData.get("proof");
  if (!(file instanceof File)) {
    return jsonError("Pilih file bukti pembayaran.", 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return jsonError("Bukti pembayaran maksimal 5 MB.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    validateProofFile(file, bytes);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Format bukti tidak valid.", 400);
  }
  try {
    validatePaymentStorageConfiguration();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Penyimpanan bukti belum dikonfigurasi.",
      503,
    );
  }

  let upload: { path: string; mimeType: string };
  try {
    upload = await uploadPaymentProof(payment.id, file, bytes);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal menyimpan bukti pembayaran.",
      502,
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["PENDING", "REJECTED"] } },
        data: {
          status: "AWAITING_REVIEW",
          proofPath: upload.path,
          proofMimeType: upload.mimeType,
          submittedAt: new Date(),
          reviewedAt: null,
          reviewedById: null,
        },
      });
      if (!result.count) return false;
      await tx.activityLog.create({
        data: {
          userId: auth.user!.id,
          type: "PAYMENT_PROOF_SUBMITTED",
          metadata: { invitationId: payment.invitationId, paymentId: payment.id, proofSubmitted: true },
        },
      });
      return true;
    });
    if (!updated) {
      await deletePaymentProof(upload.path);
      return jsonError("Status pembayaran berubah. Muat ulang halaman lalu coba lagi.", 409);
    }
  } catch (error) {
    await deletePaymentProof(upload.path);
    throw error;
  }

  if (payment.proofPath) await deletePaymentProof(payment.proofPath);
  return NextResponse.json({ message: "Bukti berhasil dikirim dan menunggu verifikasi admin." });
}
