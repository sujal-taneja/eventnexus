# EventNexus

EventNexus is an event ticketing platform: discover events, buy tickets with secure checkout, and manage everything from listing to **camera-based QR check-in at the door**. Organizers publish events and sell multiple ticket tiers; attendees get QR codes and PDF tickets; the platform handles seat holds, payments, and role-based access.

Built with **Next.js**, **PostgreSQL**, **Redis**, and **Stripe**

---

## Try it quickly (demo guide)

This project is wired for **local development and demos**. Payments use **Stripe Test Mode only** — no real money moves.

### 1. Sign in

Use **GitHub** or **Google** on `/login`. There are no email/password accounts.

### 2. Become an organizer

1. Open **For Organisers** (`/organizers`).
2. Enter the organiser code: **`eventnexus`**
3. Submit — your account upgrades to **ORGANIZER** (requires `BECOME_ORGANIZER=eventnexus` in `.env.local`).

You can then open **Organiser dashboard** (`/organizer`) to create and manage your events.

### 3. What organizers can do

| Capability                         | Details                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Manage events**                  | Create events, set date/location/category/image, add ticket tiers (name, price, capacity), edit listings, view attendees.                        |
| **Free tickets for own events**    | When your cart contains **only tickets for events you organize**, checkout completes at **₹0** — no Stripe charge (complimentary / “comp” flow). |
| **Camera QR check-in (event day)** | See [Camera-based QR check-in](#camera-based-qr-check-in-event-day) below.                                                                       |

Attendees show QR codes from **Dashboard** → event detail, or from confirmation/reminder emails when email is configured.

#### Camera-based QR check-in (event day)

Organizers verify entry using the **device camera** — no external scanner hardware required.

1. Go to **Organiser dashboard** → **Events** → pick your event → **Check-in**  
   (direct URL: `/organizer/events/[eventId]/check-in`).
2. Click to **start the camera** and allow browser permission when prompted (HTTPS or `localhost`).
3. Point the camera at the attendee’s **EventNexus QR code** (on their phone screen or printed PDF).
4. The app decodes payloads like `eventnexus:batch:<booking-ids>` and calls the check-in API.
5. On success, those **confirmed** bookings for **your event** get a **checked-in** timestamp; the attendee list reflects who has arrived.

Works in modern browsers via an in-app QR reader (`html5-qrcode`). Use a phone or laptop webcam at the venue entrance on event day.

### 4. Pay with Stripe (test cards)

Checkout uses **Stripe Test Mode**. Use [Stripe test card numbers](https://docs.stripe.com/testing#cards); any future expiry, any CVC, any billing ZIP.

| Intent                 | Card number           | Result                                                |
| ---------------------- | --------------------- | ----------------------------------------------------- |
| **Successful payment** | `4242 4242 4242 4242` | Payment succeeds; bookings confirm; QR/PDF available. |
| **Generic decline**    | `4000 0000 0000 0002` | Card declined.                                        |
| **Insufficient funds** | `4000 0000 0000 9995` | Decline (insufficient funds).                         |
| **Expired card**       | `4000 0000 0000 0069` | Decline (expired).                                    |
| **Incorrect CVC**      | `4000 0000 0000 0127` | Decline (CVC check fails).                            |

Use **`sk_test_…`** and **`pk_test_…`** keys only. Production live keys are out of scope for the current setup.

**Webhook:** For paid checkout to finalize reliably, run Stripe CLI forwarding (included in `npm run dev`) or set `STRIPE_WEBHOOK_SECRET` from `stripe listen`.

**Note:** Checkout may show a demo promo field (`NEXUS10`) that adjusts the **displayed** total; the amount sent to Stripe is always computed **server-side** from database ticket prices.

---

## Product overview

### For attendees

- Browse and **search** events (full-text + filters: category, city, price, sort).
- View **live seat availability** per ticket tier (includes short-lived holds during checkout).
- **Cart** across events → **10-minute seat reservation** → **Stripe checkout** (INR).
- **Dashboard** with today / upcoming / past bookings.
- **QR codes** per purchase batch and **downloadable PDF** tickets.
- Profile and policy pages (About, Pricing, Terms, Privacy, Refunds, Contact).

### For organizers

- Overview stats and **30-day revenue chart**.
- **Create / edit** events and **multiple ticket tiers**.
- **Attendee list** and **CSV export** per event.
- **Camera-based QR check-in** on event day (`/organizer/events/[id]/check-in`) — scan attendee QR codes with the device camera to mark bookings as checked in.
- **Revenue CSV** report across your events.
- **Email digests** (when Resend + crons are configured): monthly revenue, post-event summary.

### For admins (`ADMIN` role)

- Platform metrics on `/admin`.
- Change user roles (`USER` / `ORGANIZER` / `ADMIN`).
- Activate or deactivate events platform-wide.

Promote the first admin by setting `User.role` to `ADMIN` in the database (e.g. Prisma Studio), then use **Users & Roles** in the admin UI.

---

## How booking works

```mermaid
sequenceDiagram
  participant User
  participant App
  participant Redis
  participant Stripe
  participant DB

  User->>App: Add tickets to cart
  User->>App: POST /api/reserve
  App->>Redis: Hold seats (~10 min)
  User->>App: POST /api/stripe/payment-intent
  App->>DB: Load prices & capacity
  alt Own events only (organizer)
    App->>DB: Create CONFIRMED bookings (₹0)
  else Paid checkout
    App->>Stripe: Create PaymentIntent (test)
    User->>Stripe: Pay with test card
    Stripe->>App: Webhook payment_intent.succeeded
    App->>DB: Create CONFIRMED bookings
  end
  App->>Redis: Release holds
  User->>App: Dashboard QR / PDF
  Note over User,App: Event day — organizer uses device camera to scan attendee QR at door
```

---

## Tech stack

| Layer         | Choice                                                        |
| ------------- | ------------------------------------------------------------- |
| App           | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| Database      | PostgreSQL + Prisma                                           |
| Cache / locks | Redis                                                         |
| Auth          | NextAuth v5 — GitHub & Google OAuth, JWT sessions             |
| Payments      | Stripe Payment Intents + webhooks (**test mode**)             |
| Email         | Resend + React Email (optional)                               |
| Tests         | Vitest                                                        |

---

## Prerequisites

- Node.js **20+**
- Docker (recommended) for Postgres + Redis, or local services on `5432` / `6379`
- OAuth apps (GitHub and/or Google)
- **Stripe account (test mode)** + [Stripe CLI](https://stripe.com/docs/stripe-cli) for local webhooks

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start databases

```bash
docker compose up -d
```

### 3. Configure environment

Create `.env.local`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/eventnexus"
REDIS_URL="redis://localhost:6379"

AUTH_SECRET="run: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

GITHUB_ID=""
GITHUB_SECRET=""
GOOGLE_ID=""
GOOGLE_SECRET=""

# Stripe — TEST keys only
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Organiser upgrade code (demo)
BECOME_ORGANIZER="eventnexus"

# Optional
RESEND_API_KEY=""
EMAIL_FROM="EventNexus <onboarding@resend.dev>"
ADMIN_EMAIL=""
CRON_SECRET=""
ORGANIZER_MONTHLY_REPORT_DAY="1"
```

See `sample_env.text` for a full variable checklist.

### 4. Database and search

```bash
npx prisma db push
npx prisma db seed
npm run setup:search
```

Seed loads sample events and demo organizer records (OAuth sign-in still uses **your** GitHub/Google account).

### 5. Run

```bash
npm run dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Prisma Studio: [http://localhost:5555](http://localhost:5555)
- Stripe webhooks forwarded to `/api/stripe/webhook`

Next.js only:

```bash
npm run dev:next
npm run stripe:listen   # separate terminal
```

---

## Environment reference

| Variable                | Required                 | Description                                |
| ----------------------- | ------------------------ | ------------------------------------------ |
| `DATABASE_URL`          | Yes                      | PostgreSQL                                 |
| `REDIS_URL`             | No                       | Default `redis://localhost:6379`           |
| `AUTH_SECRET`           | Yes                      | NextAuth secret                            |
| `NEXT_PUBLIC_APP_URL`   | Yes (prod)               | Public URL for links                       |
| `GITHUB_*` / `GOOGLE_*` | One provider             | OAuth                                      |
| `STRIPE_*`              | For paid checkout        | **Test** keys + webhook secret             |
| `BECOME_ORGANIZER`      | For self-serve organizer | Set to `eventnexus` for demo               |
| `RESEND_API_KEY`        | No                       | Transactional email                        |
| `CRON_SECRET`           | Prod crons               | Bearer token for scheduled jobs            |
| Turnstile keys          | No                       | Bot protection on reserve/checkout/contact |

---

## npm scripts

| Command                          | Description                          |
| -------------------------------- | ------------------------------------ |
| `npm run dev`                    | Next + Stripe listen + Prisma Studio |
| `npm run dev:next`               | Next.js only                         |
| `npm run build` / `start`        | Production build & server            |
| `npm run test` / `check`         | Vitest / lint + test                 |
| `npm run setup:search`           | PostgreSQL FTS indexes               |
| `npm run db:dump` / `db:restore` | Data export/import                   |

---

## Project layout

```
src/app/          Pages and API routes
src/components/   UI (events, checkout, organizer, layout)
src/emails/       Email templates
src/lib/          Auth, Prisma, Redis, Stripe, search, PDF
src/proxy.ts      Route protection (login redirects)
prisma/           Schema, seed, search setup
```

---

## Main routes

| Path                              | Who       | Purpose                                 |
| --------------------------------- | --------- | --------------------------------------- |
| `/`, `/events`, `/categories`     | Public    | Discovery                               |
| `/events/[id]`                    | Public    | Event detail & tickets                  |
| `/organizers`                     | Public    | Host with us + code **`eventnexus`**    |
| `/login`                          | Public    | OAuth                                   |
| `/dashboard`                      | User      | My tickets & QR                         |
| `/checkout`                       | User      | Pay (test card) or free (own events)    |
| `/organizer/events/[id]/check-in` | Organizer | **Camera QR scanner** for door check-in |
| `/organizer/**`                   | Organizer | Events, attendees, reports              |
| `/admin/**`                       | Admin     | Users & platform events                 |

---

## Testing & deployment

```bash
npm run test
```

Deploying to Vercel: managed Postgres + Redis, all env vars, `npm run setup:search` on production DB once, Stripe **test** webhook URL or switch to live keys only when you intentionally go production. Cron paths are listed in `vercel.json`.
