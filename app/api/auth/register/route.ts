import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (isErrorResponse(body)) return body;

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        username: parsed.data.username,
        email: parsed.data.email,
        passwordHash,
      },
      select: { id: true, name: true, username: true, email: true, role: true, isActive: true },
    });
    await prisma.$transaction([
      prisma.activityLog.create({ data: { userId: user.id, type: "REGISTER" } }),
      prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    ]);
    const token = await createSessionToken(user);
    const response = NextResponse.json(
      { user: { ...user, isActive: false } },
      { status: 201 },
    );
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Email atau username sudah digunakan.", 409);
    }
    throw error;
  }
}
