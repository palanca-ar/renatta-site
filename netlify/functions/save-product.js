import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);
  
  const auth = requireAuth(context);
  if (!auth.ok) return auth.response;
  
  let body;
  try { body = await req.json(); }
  catch { return errorResponse("invalid JSON", 400); }
  
  const { action, product, code } = body;
  if (!action) return errorResponse("missing 'action' (create|update|delete)");
  
  const store = getStore("renatta-data");
  let products = (await store.get("products", { type: "json" })) || [];
  
  if (action === "create") {
    if (!product || !product.code) return errorResponse("missing product or product.code");
    if (products.some(p => p.code === product.code)) return errorResponse(`code "${product.code}" already exists`, 409);
    product.code_safe = product.code.replace(/[\\/<>:"|?*]/g, "_");
    products.unshift(product);
  } else if (action === "update") {
    if (!product || !product.code) return errorResponse("missing product or product.code");
    const idx = products.findIndex(p => p.code === product.code);
    if (idx < 0) return errorResponse(`code "${product.code}" not found`, 404);
    product.code_safe = product.code.replace(/[\\/<>:"|?*]/g, "_");
    products[idx] = { ...products[idx], ...product };
  } else if (action === "delete") {
    const c = code || product?.code;
    if (!c) return errorResponse("missing code");
    const before = products.length;
    products = products.filter(p => p.code !== c);
    if (products.length === before) return errorResponse(`code "${c}" not found`, 404);
  } else {
    return errorResponse(`unknown action: ${action}`);
  }
  
  await store.setJSON("products", products);
  await store.setJSON(`audit/${Date.now()}-${auth.user.email}`, {
    when: new Date().toISOString(),
    who: auth.user.email,
    action, code: code || product?.code,
  });
  
  return jsonResponse({ ok: true, total: products.length });
};
