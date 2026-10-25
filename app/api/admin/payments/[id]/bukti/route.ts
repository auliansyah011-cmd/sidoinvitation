import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { getPaymentProof } from "@/lib/payment-storage";
import { prisma } from "@/lib/db";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const { id } = await params;
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { proofPath: true, proofMimeType: true },
  });
  if (!payment?.proofPath || !payment.proofMimeType) {
    return jsonError("Bukti pembayaran tidak ditemukan.", 404);
  }
  if (!allowedMimeTypes.has(payment.proofMimeType)) {
    return jsonError("Tipe file bukti tidak diizinkan.", 415);
  }

  try {
    const storedFile = await getPaymentProof(payment.proofPath);
    return new NextResponse(storedFile.body, {
      headers: {
        "Content-Type": payment.proofMimeType,
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal membaca bukti pembayaran.",
      502,
    );
  }
}
