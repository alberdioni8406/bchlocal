import type { PrismaClient } from "@prisma/client";

export const BUSINESS_ENTITLEMENTS = [
  "Verified Business badge on profile and listings",
  "Business role and shop-style public profile",
  "Higher placement among organic (non-promoted) listings",
  "Contact details highlighted on your public profile",
  "Eligible to buy Boost, Featured, and Top Spot",
] as const;

export function promotionRank(type?: string | null): number {
  if (type === "TOP_SPOT") return 3;
  if (type === "FEATURED") return 2;
  if (type === "BOOST") return 1;
  return 0;
}

type Db = {
  user: { update: PrismaClient["user"]["update"] };
  profile: { updateMany: PrismaClient["profile"]["updateMany"] };
};

/** Apply what a paid/demo-confirmed business subscription actually unlocks. */
export async function grantBusinessEntitlements(db: Db, userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { role: "BUSINESS" },
  });
  await db.profile.updateMany({
    where: { userId },
    data: {
      isBusiness: true,
      verifiedBusiness: true,
    },
  });
}

export async function revokeExpiredBusinessEntitlements(
  db: PrismaClient,
  userId: string
) {
  await db.user.update({
    where: { id: userId },
    data: { role: "USER" },
  });
  await db.profile.updateMany({
    where: { userId },
    data: {
      isBusiness: false,
      verifiedBusiness: false,
    },
  });
}
