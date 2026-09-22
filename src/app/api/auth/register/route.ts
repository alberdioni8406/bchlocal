import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  password: z.string().min(6),
  displayName: z.string().min(1).max(80),
  city: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const limited = rateLimit({
      key: clientKey(req, "register"),
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: data.email }, { username: data.username }],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: existing.email === data.email ? "Email already registered" : "Username taken" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        profile: {
          create: {
            displayName: data.displayName,
            locationCity: data.city,
            countryCode: "MZ",
            trustLevel: "New",
          },
        },
      },
    });

    return NextResponse.json({ id: user.id, username: user.username });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    console.error("Register error:", err);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: string }).message)
        : "Server error";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    return NextResponse.json(
      {
        error: "Server error",
        detail: message.slice(0, 400),
        code,
      },
      { status: 500 }
    );
  }
}
