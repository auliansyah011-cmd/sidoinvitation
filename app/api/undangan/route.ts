import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationInputSchema, paginationSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const pagination = paginationSchema.safeParse(searchParams);
  if (!pagination.success) return validationError(pagination.error);

  const { page, limit } = pagination.data;
  const where: Prisma.InvitationWhereInput =
    auth.user.role === "ADMIN" ? {} : { ownerId: auth.user.id };
  const [total, invitations] = await Promise.all([
    prisma.invitation.count({ where }),
    prisma.invitation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        payments: {
          where: { userId: auth.user.id },
          orderBy: { createdAt: "desc" },
          take: 1,
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
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    data: invitations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const body = await readJson(request);
  if (isErrorResponse(body)) return body;

  const parsed = invitationInputSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.status === "PUBLISHED" && auth.user.role !== "ADMIN") {
    return jsonError("Hanya admin yang dapat menerbitkan undangan.", 403);
  }
  const templateSlug = parsed.data.templateId ?? "senja-di-ubud";
  const template = await prisma.invitationTemplate.findFirst({
    where: {
      slug: templateSlug,
      ...(auth.user.role === "ADMIN" ? {} : { isActive: true }),
    },
    select: { slug: true },
  });
  if (!template) return jsonError("Template tidak tersedia.", 400);

  const fallbackSlug = parsed.data.title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = parsed.data.slug ??
    `${fallbackSlug || "undangan"}-${randomBytes(3).toString("hex")}`;

  try {
    const invitation = await prisma.invitation.create({
      data: {
        ...parsed.data,
        slug,
        templateId: template.slug,
        ownerId: auth.user.id,
      },
    });
    await prisma.activityLog.create({
      data: { userId: auth.user.id, type: "INVITATION_CREATED", metadata: { invitationId: invitation.id } },
    });
    return NextResponse.json({ data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Slug undangan sudah digunakan.", 409);
    }
    throw error;
  }
}
