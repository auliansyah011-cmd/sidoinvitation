import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME || !ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, dan ADMIN_PASSWORD wajib diatur.");
  }
  if (ADMIN_PASSWORD.length < 12 || Buffer.byteLength(ADMIN_PASSWORD, "utf8") > 72) {
    throw new Error("ADMIN_PASSWORD harus 12-72 byte.");
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name: ADMIN_NAME.trim(),
      username: ADMIN_USERNAME.trim(),
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    create: {
      name: ADMIN_NAME.trim(),
      username: ADMIN_USERNAME.trim(),
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    select: { id: true, email: true, role: true },
  });

  console.log(`Admin siap: ${admin.email} (${admin.id})`);
}

main()
  .catch((error) => {
    console.error("Gagal membuat admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
