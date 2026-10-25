import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { getAuthenticatedUser, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invitationInputSchema } from "@/lib/validation";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const user = await getAuthenticatedUser(request);
  const invitation =
    (await prisma.invitation.findUnique({ where: { id } })) ??
    (await prisma.invitation.findUnique({ where: { slug: id } }));
  if (!invitation) return jsonError("Undangan tidak ditemukan.", 404);
  if (
    invitation.status !== "PUBLISHED" &&
    user?.role !== "ADMIN" &&
    invitation.ownerId !== user?.id
  ) {
    return jsonError("Undangan tidak ditemukan.", 404);
  }

  return NextResponse.json({
    data: {
      id: invitation.id,
      title: invitation.title,
      slug: invitation.slug,
      brideName: invitation.brideName,
      groomName: invitation.groomName,
      eventDate: invitation.eventDate,
      venue: invitation.venue,
      address: invitation.address,
      description: invitation.description,
      coverImage: invitation.coverImage,
      status: invitation.status,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    },
  });
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const { id } = await params;
  const body = await readJson(request);
  if (isErrorResponse(body)) return body;

  const parsed = invitationInputSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);
  if (parsed.data.status === "PUBLISHED" && auth.user.role !== "ADMIN") {
    return jsonError("Hanya admin yang dapat menerbitkan undangan.", 403);
  }

  if (parsed.data.templateId) {
    const template = await prisma.invitationTemplate.findFirst({
      where: {
        slug: parsed.data.templateId,
        ...(auth.user.role === "ADMIN" ? {} : { isActive: true }),
      },
      select: { slug: true },
    });
    if (!template) return jsonError("Template tidak tersedia.", 400);
  }

  const existing = await prisma.invitation.findFirst({
    where: {
      id,
      ...(auth.user.role === "ADMIN" ? {} : { ownerId: auth.user.id }),
    },
    select: { id: true },
  });
  if (!existing) return jsonError("Undangan tidak ditemukan.", 404);

  const { slug, ...fields } = parsed.data;
  try {
    const invitation = await prisma.invitation.update({
      where: { id },
      data: { ...fields, ...(slug ? { slug } : {}) },
    });
    return NextResponse.json({ data: invitation });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Slug undangan sudah digunakan.", 409);
    }
    throw error;
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (!auth.user) return auth.response!;

  const { id } = await params;
  const result = await prisma.invitation.deleteMany({
    where: {
      id,
      ...(auth.user.role === "ADMIN" ? {} : { ownerId: auth.user.id }),
    },
  });
  if (result.count === 0) return jsonError("Undangan tidak ditemukan.", 404);

  return new NextResponse(null, { status: 204 });
}
