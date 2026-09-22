import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const schema = z.object({
  reason: z.enum([
    "SCAM",
    "FAKE_ITEM",
    "FAKE_PAYMENT",
    "STOLEN_CONTENT",
    "ILLEGAL_ITEM",
    "HARASSMENT",
    "OTHER",
  ]),
  description: z.string().max(1000).optional(),
  listingId: z.string().optional(),
  reportedUserId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimit({
      key: clientKey(req, `report:${session.user.id}`),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many reports. Please wait before submitting another." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = schema.parse(body);

    if (!data.listingId && !data.reportedUserId) {
      return NextResponse.json(
        { error: "listingId or reportedUserId required" },
        { status: 400 }
      );
    }
    if (data.reportedUserId && data.reportedUserId === session.user.id) {
      return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        reason: data.reason,
        description: data.description,
        listingId: data.listingId,
        reportedUserId: data.reportedUserId,
        status: "OPEN",
      },
    });

    return NextResponse.json({ id: report.id, status: "OPEN" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reports = await prisma.report.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        reporter: { select: { username: true } },
        reportedUser: { select: { username: true, id: true } },
      },
    });

    return NextResponse.json({
      reports: reports.map((r) => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        status: r.status,
        listingId: r.listingId,
        reporter: r.reporter.username,
        reportedUser: r.reportedUser?.username,
        reportedUserId: r.reportedUser?.id,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ reports: [] });
  }
}
