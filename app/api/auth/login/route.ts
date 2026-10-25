import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, readJson, validationError } from "@/lib/api";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (isErrorResponse(body)) return body;

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (
    !user ||
    user.role !== "USER" ||
    user.disabledAt !== null ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return jsonError("Email atau kata sandi salah.", 401);
  }

  const safeUser = {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
  const token = await createSessionToken(safeUser);
  await prisma.$transaction([
    prisma.activityLog.create({ data: { userId: user.id, type: "LOGIN" } }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
  ]);
  const response = NextResponse.json({ user: safeUser });
  setSessionCookie(response, token);
  return response;
}
