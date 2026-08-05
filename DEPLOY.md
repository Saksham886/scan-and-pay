# Deploying the backend to Vercel

The backend is the Next.js app at the repo root. Vercel auto-detects it — no
special config needed (`npm run build` runs `prisma generate && next build`).

## 1. Import the repo

Vercel → **Add New… → Project** → import `Saksham886/scan-and-pay`.
Framework preset: **Next.js** (auto-detected). Root directory: **/** (repo root).
The `kiosk-app/` and `scanpay frontend/` folders are ignored by the Next.js build.

## 2. Environment variables

Set these under **Settings → Environment Variables** (scope to **Production**,
and **Preview** if you use preview deploys).

### Required — the app will not run without these

| Key | Value / where to get it |
|---|---|
| `DATABASE_URL` | Postgres connection string (project uses Neon / `adapter-pg`), e.g. `postgresql://user:pass@host/db?sslmode=require` |
| `AUTH_SECRET` | Output of `openssl rand -base64 32` |
| `AUTH_URL` | Your exact deployed URL, e.g. `https://scan-and-pay.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | **Same** URL as `AUTH_URL` |

> `AUTH_URL` / `NEXT_PUBLIC_APP_URL` must match the real domain — they build
> payment return/callback URLs. Set them once the domain is known, then redeploy.
> Do **not** set `NODE_ENV` or `PORT`; Vercel manages those.

### Required for the native QR payment flow

| Key | Value |
|---|---|
| `RAZORPAY_KEY_ID` | Razorpay Dashboard → Settings → API Keys (`rzp_live_…` for real payments) |
| `RAZORPAY_KEY_SECRET` | Same page (shown once on generation) |
| `RAZORPAY_WEBHOOK_SECRET` | The signing secret you set on the webhook (see step 3) |
| `RAZORPAY_USE_QR` | `true` — turns on the native single-QR kiosk flow |
| `RAZORPAY_QR_CLOSE_MINUTES` | `15` |

Per-cafe Razorpay keys set in the admin panel override these globals; the env
vars are the fallback used when a cafe has none of its own.

### Recommended

| Key | Why |
|---|---|
| `REDIS_URL` | Upstash `rediss://…` string. On Vercel (multi-instance serverless), live order updates to the staff dashboard need Redis fan-out; without it, SSE only works within a single instance. Provision via Vercel Marketplace → Upstash. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Needed for menu image uploads in the admin panel |

### Optional

| Key | Notes |
|---|---|
| `PHONEPE_TEST_MODE`, `PHONEPE_BASE_URL`, `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX` | Only if any cafe uses **PhonePe**. If all cafes use Razorpay, skip these. **Never** set `PHONEPE_TEST_MODE=true` in production — it auto-marks orders PAID without a real payment. |
| `WHATSAPP_PROVIDER` + `TWILIO_*` / `META_*` | Only for WhatsApp order notifications. Omit → messages just log to console (no-op). |

### Minimum viable set to go live with QR

`DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXT_PUBLIC_APP_URL`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`,
`RAZORPAY_USE_QR=true`, `RAZORPAY_QR_CLOSE_MINUTES=15` — plus `REDIS_URL` if you
want live dashboard updates.

See `.env.example` for the full annotated list of every variable.

## 3. Razorpay webhook (after the first deploy)

Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**:

- **URL:** `https://<your-domain>/api/webhooks/razorpay`
- **Secret:** the same value as `RAZORPAY_WEBHOOK_SECRET`
- **Active events:** `qr_code.credited` and `qr_code.closed` (required for the
  QR flow — credited confirms payment, closed fails an expired/abandoned QR),
  `payment.captured`, `order.paid` (and `payment_link.paid` only if you use
  Payment Links)

The webhook is a backstop: the kiosk also reconciles actively while the customer
pays, so payments still settle if a webhook is briefly delayed.

## 4. Database

Run migrations against your production database once (from a machine with
`DATABASE_URL` set to the prod DB):

```
npx prisma migrate deploy
```

The native-QR feature added **no schema changes**, so no new migration is needed
for it specifically — but the base schema must be applied to a fresh database.

## 5. Kiosk app (not hosted on Vercel)

The Flutter kiosk in `kiosk-app/` talks to this backend via a build-time flag,
not an env var. Build it pointing at your deployment:

```
flutter build apk --dart-define=API_BASE_URL=https://<your-domain>
```

(Default is baked into `kiosk-app/lib/config/constants.dart`.)

## 6. Rollback

The QR flow is fully behind a flag. To revert to the previous Standard Checkout
WebView flow without a redeploy, set `RAZORPAY_USE_QR=false` (and redeploy, or
change the env var and trigger a redeploy). In-flight payments still reconcile —
each is identified by its stored id prefix (`qr_` / `order_` / `plink_`).
