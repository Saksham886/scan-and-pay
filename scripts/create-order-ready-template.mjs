// Creates the `order_ready` WhatsApp template via the Meta API.
// Body params must stay in this order to match notifyOrderReady():
//   {{1}} = customer name, {{2}} = order number, {{3}} = cafe name
import { readFileSync } from "node:fs";

const env = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const TOKEN = env.META_WHATSAPP_ACCESS_TOKEN;
const WABA = "1525847068943171";
const V = "v20.0";

const payload = {
  name: "order_ready_alert",
  language: "en",
  category: "UTILITY",
  components: [
    {
      type: "BODY",
      text: "Hi {{1}}, your order #{{2}} at {{3}} is ready for pickup! 🛎️ Please collect it at the counter. Thanks for ordering with us!",
      example: { body_text: [["Tanmay", "A12", "Brew & Bites HSR"]] },
    },
  ],
};

const res = await fetch(`https://graph.facebook.com/${V}/${WABA}/message_templates`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify(payload),
});
console.log("status:", res.status);
console.log(JSON.stringify(await res.json(), null, 2));
