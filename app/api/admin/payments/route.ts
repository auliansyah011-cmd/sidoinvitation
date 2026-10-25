import { NextRequest, NextResponse } from "next/server";
import { validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paginationSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const parsed = paginationSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return validationError(parsed.error);
  const { page, limit } = parsed.data;
  const where = { status: "AWAITING_REVIEW" as const };
  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { submittedAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orderId: true,
        amount: true,
        paymentCode: true,
        currency: true,
        bank: true,
        proofMimeType: true,
        submittedAt: true,
        user: { select: { id: true, name: true, email: true } },
        invitation: { select: { id: true, title: true, brideName: true, groomName: true } },
      },
    }),
  ]);
  return NextResponse.json({
    data: payments,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
