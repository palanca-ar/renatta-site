import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

// Guarda los ajustes de presentación (colores y textos). Solo admin.
// Hace merge contra lo que ya había en vez de reemplazar: así, si más adelante
// se agregan campos nuevos, guardar desde una versión vieja del panel no los borra.
export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  let body;
  try { body = await req.json(); }
  catch { return errorResponse("invalid JSON", 400); }

  const incoming = body && body.settings ? body.settings : body;
  if (!incoming || typeof incoming !== "object") return errorResponse("missing settings", 400);

  const store = getStore("renatta-data");
  const current = (await store.get("settings", { type: "json", consistency: "strong" })) || {};
  const merged = { ...current, ...incoming };

  await store.setJSON("settings", merged);
  return jsonResponse({ ok: true, settings: merged });
};
