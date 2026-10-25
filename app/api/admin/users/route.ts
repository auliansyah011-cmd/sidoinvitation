import { NextRequest, NextResponse } from "next/server";
import { validationError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { paginationSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.user) return auth.response!;

  const parsed = paginationSchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) return validationError(parsed.error);

  const { page, limit } = parsed.data;
  const where = { role: "USER" as const };
  const [
    total,
    users,
    totalInvitations,
    paidPayments,
    activeUsers,
    disabledUsers,
    recentActivity,
  ] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          isActive: true,
          disabledAt: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: {
              invitations: true,
              payments: { where: { status: "PAID" } },
            },
          },
          invitations: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
              payments: {
                where: { status: "PAID" },
                take: 1,
                select: { amount: true, paymentCode: true, paidAt: true },
              },
            },
          },
        },
      }),
      prisma.invitation.count({ where: { owner: { role: "USER" } } }),
      prisma.payment.count({
        where: { status: "PAID", user: { role: "USER" } },
      }),
      prisma.user.count({ where: { ...where, isActive: true, disabledAt: null } }),
      prisma.user.count({ where: { ...where, disabledAt: { not: null } } }),
      prisma.activityLog.findMany({
        where: { user: { role: "USER" } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          type: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          metadata: true,
        },
      }),
    ]);

  return NextResponse.json({
    data: users,
    recentActivity,
    summary: {
      totalUsers: total,
      activeUsers,
      disabledUsers,
      totalInvitations,
      paidPayments,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
