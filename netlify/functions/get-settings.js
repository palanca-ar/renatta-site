import { getStore } from "@netlify/blobs";
import { jsonResponse } from "./_auth.js";

// Ajustes de presentación de la lista (colores y textos).
// Viven en la key "settings" del mismo store, separada del catálogo: tocar
// colores o textos nunca puede pisar productos.
// Lectura con consistencia fuerte + no-store porque el panel necesita ver
// al instante lo que acaba de guardar (y el catálogo público también).
export default async (req, context) => {
  if (req.method !== "GET") return jsonResponse({ error: "method not allowed" }, 405);

  const store = getStore("renatta-data");
  let settings = await store.get("settings", { type: "json", consistency: "strong" });
  if (!settings) settings = {};

  return new Response(JSON.stringify(settings), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
};
