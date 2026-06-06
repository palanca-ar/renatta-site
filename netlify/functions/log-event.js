import { getStore } from "@netlify/blobs";
import { errorResponse, jsonResponse } from "./_auth.js";

const VALID_TYPES = new Set(["visit", "view_product", "add_cart", "remove_cart", "wa_order", "search"]);

// Genera un hash anónimo de IP para visitas únicas
async function hashIP(ip, salt = "renatta-v1") {
  const enc = new TextEncoder().encode(ip + salt);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2,"0")).join("");
}

export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);
  
  let body;
  try { body = await req.json(); }
  catch { return errorResponse("invalid JSON", 400); }
  
  const { type, code, value, meta } = body;
  if (!type || !VALID_TYPES.has(type)) return errorResponse(`invalid event type. Allowed: ${[...VALID_TYPES].join(", ")}`);
  
  // Día actual en formato YYYY-MM-DD (Buenos Aires timezone aprox)
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = await hashIP(ip);
  
  const store = getStore("renatta-metrics");
  
  // Increment counters via daily aggregate
  const dayKey = `daily/${day}`;
  let daily = (await store.get(dayKey, { type: "json" })) || {
    day, visits: 0, uniques: new Set(), views: {}, cartAdds: {}, orders: 0, orderTotal: 0,
    hourly: Object.fromEntries(Array.from({length: 24}, (_,h) => [h, 0])),
    searches: 0
  };
  
  // Convert uniques from array back to Set (Blobs serializes Sets as arrays)
  if (Array.isArray(daily.uniques)) daily.uniques = new Set(daily.uniques);
  
  if (type === "visit") {
    daily.visits += 1;
    daily.uniques.add(ipHash);
    daily.hourly[hour] = (daily.hourly[hour] || 0) + 1;
  } else if (type === "view_product") {
    if (code) daily.views[code] = (daily.views[code] || 0) + 1;
  } else if (type === "add_cart") {
    if (code) daily.cartAdds[code] = (daily.cartAdds[code] || 0) + 1;
  } else if (type === "wa_order") {
    daily.orders += 1;
    if (typeof value === "number") daily.orderTotal += value;
  } else if (type === "search") {
    daily.searches = (daily.searches || 0) + 1;
  }
  
  // Re-serialize Set as Array
  daily.uniques = [...daily.uniques];
  await store.setJSON(dayKey, daily);
  
  return jsonResponse({ ok: true }, 200);
};
