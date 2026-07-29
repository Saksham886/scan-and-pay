import { NextResponse } from "next/server";

/**
 * These routes are called by the kiosk app (a separate origin - a packaged
 * Flutter web/desktop/mobile build, not served from this Next.js app) and
 * take no cookies/session, so a permissive CORS policy here doesn't expose
 * anything a same-origin browser client couldn't already reach.
 */
export const KIOSK_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export function corsPreflightResponse() {
  return new NextResponse(null, { status: 204, headers: KIOSK_CORS_HEADERS });
}
