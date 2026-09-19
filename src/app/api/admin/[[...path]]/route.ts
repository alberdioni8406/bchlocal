import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

type Ctx = { params: Promise<{ path?: string[] }> };

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

async function stats() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeListings,
      completedOrders,
      revenueToday,
      revenueWeek,
      revenueMonth,
      totalRevenue,
      byProduct,
      openReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count({ where: { status: "ACTIVE" } }),
      prisma.order.count({ where: { status: "COMPLETED" } }),
      prisma.revenueTransaction.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfDay } },
        _sum: { amountMzn: true },
      }),
      prisma.revenueTransaction.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfWeek } },
        _sum: { amountMzn: true },
      }),
      prisma.revenueTransaction.aggregate({
        where: { status: "PAID", paidAt: { gte: startOfMonth } },
        _sum: { amountMzn: true },
      }),
      prisma.revenueTransaction.aggregate({
        where: { status: "PAID" },
        _sum: { amountMzn: true },
      }),
      prisma.revenueTransaction.groupBy({
        by: ["product"],
        where: { status: "PAID" },
        _sum: { amountMzn: true },
      }),
      prisma.report.count({ where: { status: "OPEN" } }),
    ]);

    const breakdown: Record<string, number> = {};
    for (const row of byProduct) {
      breakdown[row.product] = Number(row._sum.amountMzn || 0);
    }

    return NextResponse.json({
      totalUsers,
      activeListings,
      completedOrders,
      openReports,
      revenue: {
        today: Number(revenueToday._sum.amountMzn || 0),
        week: Number(revenueWeek._sum.amountMzn || 0),
        month: Number(revenueMonth._sum.amountMzn || 0),
        total: Number(totalRevenue._sum.amountMzn || 0),
        breakdown,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({
      totalUsers: 0,
      activeListings: 0,
      completedOrders: 0,
      openReports: 0,
      revenue: { today: 0, week: 0, month: 0, total: 0, breakdown: {} },
    });
  }
}

async function getSettings() {
  try {
    const settings = await prisma.platformSetting.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;
    return NextResponse.json(map);
  } catch {
    return NextResponse.json({});
  }
}

const settingsSchema = z.object({
  price_boost: z.string().optional(),
  price_featured: z.string().optional(),
  price_top_spot: z.string().optional(),
  price_business_monthly: z.string().optional(),
});

async function saveSettings(req: NextRequest) {
  try {
    const body = settingsSchema.parse(await req.json());
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined) {
        await prisma.platformSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        });
      }
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const moderateSchema = z.object({
  reportId: z.string(),
  action: z.enum([
    "hide_listing",
    "suspend_user",
    "delete_listing",
    "dismiss",
    "restore_listing",
  ]),
  targetId: z.string().optional(),
});

async function moderate(req: NextRequest, adminId: string) {
  try {
    const body = await req.json();
    const { reportId, action, targetId } = moderateSchema.parse(body);

    if (action === "hide_listing" && targetId) {
      await prisma.listing.update({
        where: { id: targetId },
        data: { status: "HIDDEN" },
      });
    }
    if (action === "delete_listing" && targetId) {
      await prisma.listing.update({
        where: { id: targetId },
        data: { status: "DELETED" },
      });
    }
    if (action === "restore_listing" && targetId) {
      await prisma.listing.update({
        where: { id: targetId },
        data: { status: "ACTIVE" },
      });
    }
    if (action === "suspend_user" && targetId) {
      await prisma.user.update({
        where: { id: targetId },
        data: { isSuspended: true },
      });
    }

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: action === "dismiss" ? "DISMISSED" : "RESOLVED",
        resolvedAt: new Date(),
        adminNotes: `Action: ${action}`,
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId,
        action,
        targetType: action.includes("listing")
          ? "listing"
          : action.includes("user")
          ? "user"
          : "report",
        targetId: targetId || reportId,
        notes: `Report ${reportId}`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const reportSchema = z.object({
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

async function listReports() {
  try {
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

async function createReport(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = reportSchema.parse(body);

    if (!data.listingId && !data.reportedUserId) {
      return NextResponse.json(
        { error: "listingId or reportedUserId required" },
        { status: 400 }
      );
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
    const detail = err instanceof Error ? err.message.slice(0, 500) : "unknown";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : undefined;
    return NextResponse.json({ error: "Server error", detail, code }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0] || "stats";

  if (segment === "reports") {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return listReports();
  }

  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (segment === "stats") return stats();
  if (segment === "settings") return getSettings();
  return NextResponse.json({ error: "Unknown admin path" }, { status: 404 });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  const segment = path?.[0];

  // Any logged-in user can submit a report
  if (segment === "reports") {
    return createReport(req);
  }

  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (segment === "settings") return saveSettings(req);
  if (segment === "moderate") return moderate(req, session.user.id);
  return NextResponse.json({ error: "Unknown admin path" }, { status: 404 });
}
