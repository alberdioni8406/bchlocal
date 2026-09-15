# BCH Local V1

**Buy. Sell. Get paid. In Bitcoin Cash.**

A production-quality MVP local marketplace with Bitcoin Cash as the native payment rail.  
Initial market: Mozambique (Maputo/Matola). Architecture ready for international expansion.

---

## Principles

1. BCH is the payment rail — **no platform wallet**, no seed phrases, no custody of user funds  
2. Marketplace-first UX; crypto only appears at payment time  
3. Revenue is first-class (listing promotions + business subscriptions)  
4. Demo Payment Mode is strictly isolated (`DEMO_PAYMENT_MODE=true`)  
5. Mobile-first, simple, trustworthy  

---

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4  
- **PostgreSQL** (Neon recommended) + **Prisma**  
- **next-auth** (credentials)  
- Server API routes, mobile bottom nav, PWA-ready  

---

## Quick start

```bash
cd bch-local
cp .env.example .env

# Required in .env:
# DATABASE_URL="postgresql://..."
# NEXTAUTH_SECRET="generate-a-long-random-string"
# NEXTAUTH_URL="http://localhost:3000"
# DEMO_PAYMENT_MODE="true"

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open **http://localhost:3000**

### Demo accounts (after seed)

| Role  | Email                 | Password  |
|-------|-----------------------|-----------|
| User  | joao@demo.mz          | demo1234  |
| Admin | admin@bchlocal.mz     | demo1234  |

---

## Features implemented

### Marketplace
- Homepage (hero, categories, revenue & business CTAs, footer)
- Browse with search, category filters, sort (price / recent)
- Listing detail with images, BCH equivalent, seller reputation
- Multi-step **Sell** flow → publish → **promote upsell**
- Favorites
- Public user profiles (`/u/[username]`)
- Categories page
- How it works, Safety, Terms, Privacy, Contact

### Auth & profiles
- Sign up / Sign in (credentials)
- Session-aware navigation
- Seller dashboard (My Listings)
- Business upgrade page

### Transactions
- Create order → unique payment request
- BCH payment page (QR placeholder, address, amount, expiry, status)
- **Demo Payment Mode** (clearly labelled; advances status for testing only)
- Order completion updates listing + seller transaction count

### Messaging
- Start conversation from listing
- Conversation list + thread UI
- Send / receive messages
- Safety warnings

### Trust & safety
- Report listing / user (API + reasons)
- Admin moderation (hide listing, suspend user, dismiss)
- Reputation badges (New / Established / Trusted / Verified)
- Anti-scam copy on payment & messaging

### Revenue
- Boost (3d) / Featured (7d) / Top Spot (14d)
- Business subscription (UI + model)
- `RevenueTransaction` records (only PAID counts)
- Admin dashboard: today / week / month / total + product breakdown
- Configurable prices in admin (stored in DB)

### Admin
- Dashboard stats (users, listings, orders, reports, revenue)
- Reports queue + moderation actions
- Price settings (save to PlatformSetting)

---

## API map (11 serverless functions — under Vercel Hobby limit of 12)

Routes are consolidated with optional catch-alls so public URLs stay the same.

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/api/listings` · `/api/listings/[id]` | List / create / detail |
| GET/POST | `/api/orders` · `/api/orders/[id]` | Create / detail / demo pay |
| GET/POST | `/api/messages` · `/api/messages/[id]` | Conversations / thread |
| GET/POST | `/api/admin/stats` · `/settings` · `/moderate` | Admin |
| POST | `/api/promotions` | Buy promotion |
| GET/POST/DELETE | `/api/favorites` | Favorites |
| GET/POST | `/api/reports` | Reports |
| GET | `/api/me/listings` | Seller listings |
| GET | `/api/users/[username]` | Public profile |
| * | `/api/auth/[...nextauth]` | NextAuth |
| POST | `/api/auth/register` | Sign up |

---

## Environment

```env
DATABASE_URL=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
DEMO_PAYMENT_MODE=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=pt
NEXT_PUBLIC_DEFAULT_COUNTRY=MZ
NEXT_PUBLIC_DEFAULT_CITY=Maputo
```

---

## Definition of Done

| # | Criterion | Done |
|---|-----------|------|
| 1 | Browse without account | ✅ |
| 2 | Create account | ✅ |
| 3 | Publish listing | ✅ |
| 4 | Search / filter | ✅ |
| 5 | Contact seller | ✅ |
| 6 | Initiate BCH purchase | ✅ |
| 7 | Payment arch + isolated Demo Mode | ✅ |
| 8 | Reputation (models + badges) | ✅ |
| 9 | Report scams | ✅ |
| 10 | Admin moderate | ✅ |
| 11 | Sellers boost listings | ✅ |
| 12 | Business subscription UI | ✅ |
| 13 | Admin sees revenue | ✅ |
| 14 | Revenue transactions stored | ✅ |
| 15 | Mobile-first | ✅ |
| 16 | No seed phrases / private keys | ✅ |

---

## What V1 intentionally does **not** include

Escrow, DeFi, token launches, native mobile apps, AI recommendations, complex maps, portfolio tracking.

**Priority loop:** Users → Listings → Transactions → Trust → Revenue

---

## Deploy notes

- Designed for **Vercel** + **Neon**
- Set env vars in the host
- Run `prisma db push` (or migrate) against production DB
- Keep `DEMO_PAYMENT_MODE=false` in production
- Integrate a real BCH payment provider / indexer for payment detection

---

Built for Bitcoin Cash.  
Not affiliated with Bitcoin Cash developers, organizations, or foundations.
