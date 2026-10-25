import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const FIRST_PAYMENT_CODE = 1;
const LAST_PAYMENT_CODE = 999;
const MAX_ALLOCATION_ATTEMPTS = 5;

export async function ensureUserPaymentCode(userId: string) {
  for (let attempt = 0; attempt < MAX_ALLOCATION_ATTEMPTS; attempt += 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { paymentCode: true },
    });
    if (!user) throw new Error("Akun user tidak ditemukan.");
    if (user.paymentCode !== null) return user.paymentCode;

    const assignedCodes = await prisma.user.findMany({
      where: { paymentCode: { not: null } },
      select: { paymentCode: true },
    });
    const used = new Set(assignedCodes.map(({ paymentCode }) => paymentCode));
    let candidate: number | null = null;
    for (let code = FIRST_PAYMENT_CODE; code <= LAST_PAYMENT_CODE; code += 1) {
      if (!used.has(code)) {
        candidate = code;
        break;
      }
    }
    if (candidate === null) {
      throw new Error("Semua kode pembayaran 3 digit telah digunakan.");
    }

    try {
      const result = await prisma.user.updateMany({
        where: { id: userId, paymentCode: null },
        data: { paymentCode: candidate },
      });
      if (result.count === 1) return candidate;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }
      throw error;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paymentCode: true },
  });
  if (user?.paymentCode !== null && user?.paymentCode !== undefined) {
    return user.paymentCode;
  }
  throw new Error("Kode pembayaran user tidak dapat dialokasikan. Coba lagi.");
}

export function formatPaymentCode(code: number) {
  return String(code).padStart(3, "0");
}
