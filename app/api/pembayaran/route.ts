import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { paymentAmount, transferAccount } from "@/lib/payment-storage";
import { ensureUserPaymentCode } from "@/lib/payment-code";
import { prisma } from "@/lib/db";
import { paymentInputSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const invitationId = request.nextUrl.searchParams.get("invitationId");
  if (!invitationId) return jsonError("Parameter invitationId wajib diisi.", 400);

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      ...(auth.user.role === "ADMIN" ? {} : { ownerId: auth.user.id }),
    },
    select: { id: true },
  });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);

  let account: ReturnType<typeof transferAccount>;
  try {
    account = transferAccount();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Rekening tujuan belum dikonfigurasi.",
      503,
    );
  }
  const payment = await prisma.payment.findFirst({
    where: { invitationId, userId: auth.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderId: true,
      amount: true,
      paymentCode: true,
      currency: true,
      bank: true,
      status: true,
      submittedAt: true,
      paidAt: true,
      reviewedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ data: payment, transferAccount: account });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;
  const parsed = paymentInputSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: parsed.data.invitationId,
      ...(auth.user.role === "ADMIN" ? {} : { ownerId: auth.user.id }),
    },
    select: { id: true, status: true },
  });
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);
  if (invitation.status === "PUBLISHED") {
    return jsonError("Undangan ini sudah aktif.", 409);
  }

  let account: ReturnType<typeof transferAccount>;
  try {
    account = transferAccount();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Rekening tujuan belum dikonfigurasi.",
      503,
    );
  }

  const existingPayment = await prisma.payment.findFirst({
    where: {
      invitationId: invitation.id,
      userId: auth.user.id,
      status: { in: ["PENDING", "AWAITING_REVIEW"] },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, orderId: true, amount: true, paymentCode: true, currency: true, bank: true, status: true, submittedAt: true },
  });
  if (existingPayment) {
    if (existingPayment.status === "AWAITING_REVIEW") {
      return NextResponse.json({
        data: existingPayment,
        transferAccount: account,
      });
    }
    if (existingPayment.paymentCode !== null) {
      return NextResponse.json({
        data: existingPayment,
        transferAccount: account,
      });
    }

    let existingCode: number;
    try {
      existingCode = await ensureUserPaymentCode(auth.user.id);
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Kode pembayaran gagal dibuat.",
        503,
      );
    }
    const updatedPayment = await prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        paymentCode: existingCode,
        amount: existingPayment.amount + existingCode,
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        paymentCode: true,
        currency: true,
        bank: true,
        status: true,
        submittedAt: true,
      },
    });
    return NextResponse.json({
      data: updatedPayment,
      transferAccount: account,
    });
  }

  let amount: number;
  try {
    amount = paymentAmount();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Pembayaran belum dikonfigurasi.",
      503,
    );
  }

  let paymentCode: number;
  try {
    paymentCode = await ensureUserPaymentCode(auth.user.id);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Kode pembayaran gagal dibuat.",
      503,
    );
  }

  const payment = await prisma.payment.create({
    data: {
      id: randomUUID(),
      orderId: `SIDO-${randomUUID()}`,
      amount: amount + paymentCode,
      paymentCode,
      bank: account.bankName,
      userId: auth.user.id,
      invitationId: invitation.id,
    },
    select: { id: true, orderId: true, amount: true, paymentCode: true, currency: true, bank: true, status: true, submittedAt: true },
  });
  await prisma.activityLog.create({
    data: {
      userId: auth.user.id,
      type: "PAYMENT_CREATED",
      metadata: { invitationId: invitation.id, paymentId: payment.id },
    },
  });
  return NextResponse.json({ data: payment, transferAccount: account }, { status: 201 });
}
