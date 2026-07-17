# QR Ordering Platform

[![CI](https://github.com/tanmaysachann/qr-ordering-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/tanmaysachann/qr-ordering-platform/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![License](https://img.shields.io/badge/license-proprietary-lightgrey)

A multi-tenant QR-based food ordering system for cafes. Customers scan a table QR code, browse the menu, and pay via PhonePe. Cafe owners manage orders and menus in real time. A super admin oversees all cafes on the platform.

**Live Demo:** https://scanpay-ordering.vercel.app

---

## Roles

| Role | Access | URL |
|------|--------|-----|
| Customer | Scans QR code to browse menu and place orders | `/{cafeSlug}` |
| Cafe Owner | Manages menu, monitors live orders, views analytics | [/dashboard](https://scanpay-ordering.vercel.app/dashboard) |
| Super Admin | Full platform control, onboards cafes, views all orders | [/admin](https://scanpay-ordering.vercel.app/admin) |

---

## Test Credentials

### Super Admin
| Field | Value |
|-------|-------|
| Email | `admin@cafeorder.com` |
| Password | `Admin@Demo1234` |
| URL | [scanpay-ordering.vercel.app/login](https://scanpay-ordering.vercel.app/login) |

### Cafe Owner (pick any branch)
| Email | Password |
|-------|----------|
| `owner@koramangala.com` | `Owner@Demo1234` |
| `owner@indiranagar.com` | `Owner@Demo1234` |
| `owner@hsr-layout.com` | `Owner@Demo1234` |
| `owner@whitefield.com` | `Owner@Demo1234` |

URL: [scanpay-ordering.vercel.app/login](https://scanpay-ordering.vercel.app/login)

### Customer (no login required)
Customers access via QR code or directly through the cafe URL:

| Cafe | URL |
|------|-----|
| Brew & Bites Koramangala | [scanpay-ordering.vercel.app/koramangala](https://scanpay-ordering.vercel.app/koramangala) |
| Brew & Bites Indiranagar | [scanpay-ordering.vercel.app/indiranagar](https://scanpay-ordering.vercel.app/indiranagar) |
| Brew & Bites HSR | [scanpay-ordering.vercel.app/hsr-layout](https://scanpay-ordering.vercel.app/hsr-layout) |
| Brew & Bites Whitefield | [scanpay-ordering.vercel.app/whitefield](https://scanpay-ordering.vercel.app/whitefield) |

---

## Features

### Customer

- Scan a QR code at the table to instantly open the cafe menu, no app or login needed
- Browse the full menu with item images, veg/non-veg labels, descriptions, and prices
- Search for any dish by name or description with live results as you type
- Filter items by category using a scrollable tab bar
- Add items to cart and adjust quantities; the cart saves automatically so nothing is lost on refresh
- Add special instructions for the kitchen during checkout
- Pay securely via PhonePe
- Track the order live after payment with a step-by-step status timeline (Confirmed, Preparing, Ready, Picked Up)
- Get a phone notification the moment the order is ready for pickup
- Receive a WhatsApp message confirming the order and another one when it is ready

### Cafe Owner

- See all of today's incoming orders in real time; the dashboard dings with a bell sound and flashes a notification badge the moment a new order arrives
- Move orders through stages with one tap: Start Preparing, Mark Ready, Complete
- Filter orders by status: All Active, Preparing, Ready, Completed
- Cancel any order before it is completed
- Manage the full menu: add, edit, or remove items with images, prices, categories, and veg/non-veg labels
- Mark items as available or unavailable without deleting them
- Create and organise menu categories
- View analytics for any time range: total revenue, number of orders, and average order value
- Get deep insights: busiest hour of the day, best-selling items, and repeat customers
- Track cafe expenses by category with a full log and spending breakdown
- See a list of staff members assigned to the cafe

### Super Admin

- See platform-wide stats at a glance: total revenue, today's revenue, total orders, and today's orders
- Onboard new cafes in one form: cafe details and owner account are created together
- Get a ready-to-share QR code immediately after creating a cafe
- View, manage, and navigate into any cafe on the platform
- Deactivate a cafe while keeping its order history intact, or permanently delete a cafe that has no orders
- Manage menu items across all cafes from one place, including items that appear globally on every cafe
- Create global menu categories that apply to all cafes
- View all staff across every branch, filterable by cafe

---

## Order Flow

```
Customer scans QR
      |
Order placed and payment initiated via PhonePe
      |
Payment confirmed, order marked as Paid
      |
Owner dashboard dings and shows the new order
      |
WhatsApp confirmation sent to the customer
      |
Owner marks order Ready
      |
Customer gets a WhatsApp alert, a sound, and a push notification
      |
Owner marks order Completed
```

---

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL via Prisma 7
- **Auth:** NextAuth 5 (JWT, credentials)
- **Payments:** PhonePe
- **Real-time:** Server-Sent Events (SSE) with auto-reconnect
- **State:** Zustand (cart, persisted to localStorage)
- **Styling:** Tailwind CSS 4
- **Images:** Cloudinary
- **Notifications:** Meta WhatsApp Business API
- **Hosting:** Vercel

---

## Project Structure

```
src/
├── app/
│   ├── [cafeSlug]/          # Customer menu and order tracking pages
│   ├── dashboard/           # Cafe owner portal
│   ├── admin/               # Super admin portal
│   ├── api/                 # All API routes
│   └── login/
├── backend/
│   ├── lib/                 # Auth, DB client, SSE, PhonePe, notifications
│   ├── repositories/        # Data access layer
│   └── services/            # Business logic
├── frontend/
│   ├── components/          # React components (customer, dashboard, admin, ui)
│   ├── hooks/               # useSSE hook with auto-reconnect
│   └── stores/              # Zustand cart store
└── shared/
    ├── types/               # Shared TypeScript types
    └── utils/               # Currency formatting, validation helpers
```

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon serverless)
- PhonePe developer account (for payments)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/tanmaysachann/qr-ordering-platform.git
cd qr-ordering-platform

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_APP_URL, PHONEPE_* in .env

# 4. Run migrations
npx prisma migrate dev

# 5. Seed the database with demo cafes and accounts
npx tsx prisma/seed.ts

# 6. Start the dev server
npm run dev
```

App runs at http://localhost:3000

### Parallel Dev Servers

```bash
npm run dev:owner     # Owner dashboard at port 3001
npm run dev:admin     # Admin portal at port 3002
npm run dev:customer  # Customer menu at port 3003
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (pooled) |
| `DIRECT_DATABASE_URL` | For migrations | Direct connection, bypasses PgBouncer |
| `AUTH_SECRET` | Yes | NextAuth secret (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL of the deployed app |
| `PHONEPE_MERCHANT_ID` | Yes | PhonePe merchant ID |
| `PHONEPE_SALT_KEY` | Yes | PhonePe salt key |
| `PHONEPE_SALT_INDEX` | Yes | PhonePe salt index |
| `CLOUDINARY_CLOUD_NAME` | Optional | Image uploads |
| `CLOUDINARY_API_KEY` | Optional | Image uploads |
| `CLOUDINARY_API_SECRET` | Optional | Image uploads |
| `META_WHATSAPP_TOKEN` | Optional | WhatsApp Business API token |
| `META_WHATSAPP_PHONE_ID` | Optional | WhatsApp sender phone number ID |
| `RESEND_API_KEY` | Optional | Email notifications |
| `REDIS_URL` | Recommended for production | Upstash Redis connection string. Enables cross-instance SSE fan-out (order/menu live updates) and is required once traffic spans more than one serverless instance. Without it, SSE falls back to single-process in-memory delivery — fine for local dev, not safe for production. |

---

## Database

```bash
npx prisma migrate dev       # Run migrations
npx prisma generate          # Regenerate Prisma client after schema changes
npx prisma studio            # Open DB GUI in browser
npx tsx prisma/seed.ts       # Seed demo data
```

Prices are stored in **paise** (1 INR = 100 paise). Use `paiseToCurrency()` from `src/shared/utils/currency.ts` for display.
