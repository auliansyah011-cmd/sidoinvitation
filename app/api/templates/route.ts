import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.invitationTemplate.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      style: true,
      description: true,
      coverImage: true,
      color: true,
    },
  });
  return NextResponse.json({ data: templates });
}
