// Diagnostic: query Meta WhatsApp API directly to find why messages don't send.
// Reads credentials from .env. Read-only except optional --send to a test number.
import { readFileSync } from "node:fs";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const TOKEN = env.META_WHATSAPP_ACCESS_TOKEN;
const PHONE_ID = env.META_WHATSAPP_PHONE_NUMBER_ID;
const V = "v20.0";

async function get(url) {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

console.log("=== 1. Token validity (GET /me) ===");
const me = await get(`https://graph.facebook.com/${V}/me?access_token=${TOKEN}`);
console.log(me.status, JSON.stringify(me.body));

console.log("\n=== 2. Phone number info ===");
const phone = await get(
  `https://graph.facebook.com/${V}/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput&access_token=${TOKEN}`
);
console.log(phone.status, JSON.stringify(phone.body, null, 2));

console.log("\n=== 3. WABA id for this phone ===");
const waba = await get(
  `https://graph.facebook.com/${V}/${PHONE_ID}?fields=whatsapp_business_account&access_token=${TOKEN}`
);
console.log(waba.status, JSON.stringify(waba.body));
const wabaId =
  waba.body?.whatsapp_business_account?.id || waba.body?.id;

console.log("\n=== 4. Message templates (name / language / status / params) ===");
if (wabaId) {
  const tpls = await get(
    `https://graph.facebook.com/${V}/${wabaId}/message_templates?fields=name,language,status,category,components&limit=50&access_token=${TOKEN}`
  );
  if (tpls.ok) {
    for (const t of tpls.body.data || []) {
      const body = (t.components || []).find((c) => c.type === "BODY");
      const paramCount = body?.text
        ? (body.text.match(/\{\{\d+\}\}/g) || []).length
        : 0;
      console.log(
        `- ${t.name} | lang=${t.language} | status=${t.status} | category=${t.category} | bodyParams=${paramCount}`
      );
    }
  } else {
    console.log(tpls.status, JSON.stringify(tpls.body));
  }
} else {
  console.log("Could not resolve WABA id");
}

// Optional: actually attempt a send to verify end-to-end. Pass: node wa-diag.mjs --send 91XXXXXXXXXX
const sendIdx = process.argv.indexOf("--send");
if (sendIdx !== -1 && process.argv[sendIdx + 1]) {
  const to = process.argv[sendIdx + 1].replace(/\D/g, "");
  console.log(`\n=== 5. Test send order_confirmation to ${to} ===`);
  for (const lang of ["en", "en_US"]) {
    const res = await fetch(
      `https://graph.facebook.com/${V}/${PHONE_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: "order_confirmation",
            language: { code: lang },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "Test Customer" },
                  { type: "text", text: "Test Cafe" },
                  { type: "text", text: "TEST-001" },
                  { type: "text", text: "100.00" },
                ],
              },
            ],
          },
        }),
      }
    );
    const body = await res.json().catch(() => ({}));
    console.log(`lang=${lang} -> ${res.status} ${JSON.stringify(body)}`);
  }
}
