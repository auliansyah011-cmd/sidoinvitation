import { SignJWT, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/api";

export const SESSION_COOKIE = "sidoinvitation_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export type AuthenticatedUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "USER" | "ADMIN";
  isActive: boolean;
};

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || new TextEncoder().encode(secret).length < 32) {
    throw new Error("AUTH_SECRET harus diatur dengan panjang minimal 32 karakter.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: AuthenticatedUser) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getAuthSecret());
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let subject: string;
  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    subject = payload.sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: subject },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      disabledAt: true,
    },
  });
  if (!user || user.disabledAt) return null;
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

export async function requireUser(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return { user: null, response: jsonError("Autentikasi diperlukan atau akun dinonaktifkan.", 401) };
  }
  return { user, response: null };
}

export async function requireAdmin(request: NextRequest) {
  const result = await requireUser(request);
  if (result.response) return result;
  if (result.user?.role !== "ADMIN") {
    return { user: null, response: jsonError("Akses admin diperlukan.", 403) };
  }
  return result;
}
