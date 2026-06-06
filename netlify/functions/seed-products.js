import { getStore } from "@netlify/blobs";
import { jsonResponse, errorResponse } from "./_auth.js";

const SEED_SECRET = "renatta-seed-2026-only-once";

export default async (req, context) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== SEED_SECRET) return errorResponse("forbidden", 403);
  
  const store = getStore("renatta-data");
  
  // Si ya hay productos, no overrideo
  const existing = await store.get("products", { type: "json" });
  if (existing && existing.length > 0 && url.searchParams.get("force") !== "yes") {
    return jsonResponse({ ok: false, msg: "ya hay productos cargados", count: existing.length, hint: "agregá &force=yes para overridear" });
  }
  
  let body;
  try { body = await req.json(); }
  catch { return errorResponse("Pasale el array de productos como JSON en el body", 400); }
  
  if (!Array.isArray(body)) return errorResponse("Body debe ser un array de productos");
  
  await store.setJSON("products", body);
  return jsonResponse({ ok: true, total: body.length });
};
