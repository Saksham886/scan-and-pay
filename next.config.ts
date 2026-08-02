import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Razorpay Standard Checkout runs on our own /[cafeSlug]/order/pay page rather
// than a hosted Razorpay URL, so its SDK, iframe, API calls and telemetry all
// have to be allowed here. PhonePe needs none of this because its flow is a
// full redirect off-site.
const RAZORPAY_HOSTS = "https://checkout.razorpay.com https://*.razorpay.com";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `form-action 'self' ${RAZORPAY_HOSTS}`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://*.phonepe.com ${RAZORPAY_HOSTS}`,
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline' ${RAZORPAY_HOSTS}` + (isProd ? "" : " 'unsafe-eval'"),
  "style-src 'self' 'unsafe-inline'",
  `connect-src 'self' https://api.cloudinary.com https://api.phonepe.com https://api-preprod.phonepe.com ${RAZORPAY_HOSTS}`,
  // Checkout renders itself in an iframe, and card payments hand off to the
  // bank's 3DS page inside it. Without this the modal opens empty.
  `frame-src 'self' ${RAZORPAY_HOSTS}`,
  "media-src 'self' data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  isProd ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(self), usb=(), interest-cohort=()",
  },
  // allow-popups rather than plain same-origin: some Razorpay methods (netbanking,
  // a few 3DS card flows) complete in a popup that has to talk back to the opener,
  // which strict same-origin severs.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // Kiosk app (Flutter, a separate origin) reads menus and places orders
      // through these customer-facing, cookie-less endpoints - relax CORS/CORP
      // just for them so the browser doesn't block the cross-origin response.
      {
        source: "/api/cafes/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/api/orders/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
