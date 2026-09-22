# BCH Local V2.1

**Buy. Sell. Get paid. In Bitcoin Cash.**

A local marketplace with Bitcoin Cash as the native payment rail.  
Initial market: Mozambique (Maputo / Matola). Continuation of V1/V2 — same architecture, stabilized for public testing.

Live: [bch-local.vercel.app](https://bch-local.vercel.app)

---

## V2.1 status (honest)

**Working after deploy:**

- Auth, browse, search, filters, categories
- Listings: create (with photos), edit, pause, sold, ownership checks
- Settings including seller BCH receiving address
- Orders with BIP21 payment URI + QR (non-custodial)
- Demo Payment Mode (strictly isolated — never claimed as real chain payment)
- Payment verification provider layer (`BCH_INDEXER_URL`)
- Offers: make / accept / reject / counter → order at offer price
- Messaging + notifications
- Favorites, reviews (after confirmed payment only)
- Reports + admin moderation
- **Business subscription** grants Verified Business badge + profile entitlements
- **Promotions** (Boost / Featured / Top Spot) rank above organic listings
- Trust progression on completed transactions
- Browse ranking respects paid placement

**Requires configuration for real production use:**

| Need | Env / action |
|------|----------------|
| Database | `DATABASE_URL` (Neon recommended) |
| Auth | `NEXTAUTH_SECRET`, exact `NEXTAUTH_URL` |
| Images on Vercel | `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_UPLOAD_PRESET` |
| Platform fees | `PLATFORM_BCH_ADDRESS` |
| Real payment detection | `BCH_INDEXER_URL` (+ `BCH_API_KEY` if required) |
| Leave demo mode | `DEMO_PAYMENT_MODE=false` **only after** indexer is proven |

**Not claimed:** automatic on-chain confirmation without a configured indexer.  
**Not included:** escrow, custody, DeFi, native mobile apps, AI recommendations.

---

## Principles

1. BCH is the payment rail — **no platform wallet**, no seed phrases, no custody of user trade funds  
2. Marketplace-first UX; crypto only appears at payment time  
3. Revenue is first-class (listing promotions + business subscriptions)  
4. Demo Payment Mode is strictly isolated (`DEMO_PAYMENT_MODE=true`)  
5. Mobile-first, simple, trustworthy  

---

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4  
- **PostgreSQL** (Neon recommended) + **Prisma**  
- **next-auth** (credentials)  
- Server API routes (≤12 serverless functions for Vercel Hobby)  
- Mobile bottom nav, PWA-ready  

---

## Quick start

```bash
cd bchlocal
cp .env.example .env

# Required:
# DATABASE_URL="postgresql://..."
# NEXTAUTH_SECRET="generate-a-long-random-string"
# NEXTAUTH_URL="http://localhost:3000"
# DEMO_PAYMENT_MODE="true"

# Recommended for production:
# CLOUDINARY_CLOUD_NAME / CLOUDINARY_UPLOAD_PRESET
# PLATFORM_BCH_ADDRESS="bitcoincash:..."
# BCH_INDEXER_URL / BCH_API_KEY
# NEXT_PUBLIC_APP_URL=

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open **http://localhost:3000**

### Demo accounts (after seed)

| Role  | Email             | Password  |
|-------|-------------------|-----------|
| User  | joao@demo.mz      | demo1234  |
| Admin | admin@bchlocal.mz | demo1234  |

---

## V2.1 changes (this release)

- Confirmed payments complete the order loop (listing → SOLD, seller `completedTx`, trust level)
- Business plan activation grants **Verified Business** badge and real entitlements on profile / listings
- Boost / Featured / Top Spot listings rank above organic results
- Fresher BCH/MZN rate (cache + live fetch fallback)
- Light rate limiting on register, reports, offers
- Clearer production image guidance when Cloudinary is missing

---

## Deploy notes (Vercel + Neon)

1. Neon Postgres → copy `DATABASE_URL`
2. Vercel env (Production):

   | Variable | Notes |
   |----------|--------|
   | `DATABASE_URL` | Neon connection string |
   | `NEXTAUTH_SECRET` | Long random string |
   | `NEXTAUTH_URL` | Exact production URL |
   | `NEXT_PUBLIC_APP_URL` | Same as `NEXTAUTH_URL` |
   | `DEMO_PAYMENT_MODE` | `true` while testing |
   | Cloudinary vars | Required for durable listing photos |
   | `PLATFORM_BCH_ADDRESS` | Platform fee destination only |

3. From your machine (with production `DATABASE_URL`):

   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. Redeploy. Demo users only exist after seed against that same database.

5. When ready for real payments: configure a BCH indexer, test thoroughly, then set `DEMO_PAYMENT_MODE=false`.

---

## What V2.1 does **not** guarantee

- That a peer-to-peer trade will complete safely offline (meetup does not hold funds)
- Automatic chain confirmation without your indexer
- Permanent image storage without Cloudinary (or equivalent)
- Legal / consumer protection beyond reporting and moderation tools

Users should understand: **BCH Local coordinates listings, messages, and payment requests. Settlement is peer-to-peer on Bitcoin Cash.**

---

Built for Bitcoin Cash.  
Not affiliated with Bitcoin Cash developers, organizations, or foundations.
