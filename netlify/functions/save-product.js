import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

// FIX RAÍZ (portado del template del kit creador-de-listas):
// - consistency: "strong" en la lectura → elimina race condition de Blobs cuando
//   hay escrituras seguidas. Esto resuelve los "cambios perdidos" que veía Daniel.
// - Soporte de cambio de código (action update + original_code) → permite a
//   Renatta renombrar el código de un producto sin tener que borrarlo y recrearlo.
// - Audit log: cada save deja un registro en audit/* con quien, cuando y qué.

export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("invalid JSON", 400); }

  const { action, product, code, original_code } = body;
  if (!action) return errorResponse("missing 'action' (create|update|delete)");

  const store = getStore("renatta-data");
  // FIX: consistency strong evita leer una versión vieja del blob cuando hay
  // escrituras concurrentes o muy seguidas. Sin esto, dos updates al mismo producto
  // en menos de ~1s pisaban el cambio del primero.
  let products = (await store.get("products", { type: "json", consistency: "strong" })) || [];

  if (action === "create") {
    if (!product || !product.code) return errorResponse("missing product or product.code");
    if (products.some(p => p.code === product.code)) return errorResponse(`code "${product.code}" already exists`, 409);
    product.code_safe = product.code.replace(/[\\/<>:"|?*]/g, "_");
    products.unshift(product);
  } else if (action === "update") {
    if (!product || !product.code) return errorResponse("missing product or product.code");
    if (original_code && original_code !== product.code) {
      // Cambio de código: buscar por el código viejo y validar que el nuevo no exista
      const idx = products.findIndex(p => p.code === original_code);
      if (idx < 0) return errorResponse(`code "${original_code}" not found`, 404);
      if (products.some(p => p.code === product.code)) return errorResponse("code already exists", 409);
      product.code_safe = product.code.replace(/[\\/<>:"|?*]/g, "_");
      products[idx] = { ...products[idx], ...product };
    } else {
      const idx = products.findIndex(p => p.code === product.code);
      if (idx < 0) return errorResponse(`code "${product.code}" not found`, 404);
      product.code_safe = product.code.replace(/[\\/<>:"|?*]/g, "_");
      products[idx] = { ...products[idx], ...product };
    }
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
