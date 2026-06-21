import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { prisma } from "@/shared/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid JSON" } }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.issues } }, { status: 400 });
  }

  const { email, password, name } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma.user as any).findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: { code: "CONFLICT", message: "Email already registered" } }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = await (prisma.user as any).create({
    data: { email, passwordHash, name: name ?? null, authProvider: "credentials" },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(user, { status: 201 });
}
