import { getStore } from "@netlify/blobs";
import { jsonResponse, errorResponse } from "./_auth.js";

const SEED_SECRET = "renatta-seed-2026-only-once";

export default async (req, context) => {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== SEED_SECRET) return errorResponse("forbidden", 403);
  
  const store = getStore("renatta-data");
  
  // Si ya hay productos, no overrideo (a menos que &force=yes)
  const existing = await store.get("products", { type: "json" });
  if (existing && existing.length > 0 && url.searchParams.get("force") !== "yes") {
    return jsonResponse({ ok: false, msg: "ya hay productos cargados", count: existing.length, hint: "agregá &force=yes para overridear" });
  }
  
  // Fetchear products.json del propio sitio
  const baseUrl = `${url.protocol}//${url.host}`;
  let products;
  try {
    const r = await fetch(`${baseUrl}/products.json`);
    if (!r.ok) return errorResponse(`failed to fetch /products.json (${r.status})`, 500);
    products = await r.json();
  } catch (e) {
    return errorResponse(`fetch error: ${e.message}`, 500);
  }
  
  if (!Array.isArray(products)) return errorResponse("products.json no es un array");
  
  await store.setJSON("products", products);
  return jsonResponse({ ok: true, total: products.length, source: `${baseUrl}/products.json` });
};
