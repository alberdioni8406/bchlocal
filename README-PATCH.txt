BCH Local V2.1 patch files
=========================
Copy each file into the same path in your repo (overwrite).

NEW files (create if missing):
  src/lib/rate-limit.ts
  src/lib/entitlements.ts

MODIFIED files:
  src/lib/bch.ts
  src/lib/bch-provider.ts
  src/lib/uploads.ts
  src/app/api/orders/[[...id]]/route.ts
  src/app/api/auth/register/route.ts
  src/app/api/reports/route.ts
  src/app/api/offers/route.ts
  src/app/api/listings/[[...id]]/route.ts
  src/app/api/revenue/[[...path]]/route.ts
  src/app/api/me/[[...path]]/route.ts
  src/components/ListingCard.tsx
  src/app/listing/[id]/page.tsx
  src/app/profile/page.tsx
  src/app/business/page.tsx
  src/app/u/[username]/page.tsx
  src/app/promotions/pay/page.tsx
  prisma/seed.ts

After copy:
  npm install
  npx prisma generate
  npm run build
