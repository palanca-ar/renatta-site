import { getStore } from "@netlify/blobs";
import { jsonResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "GET") return jsonResponse({ error: "method not allowed" }, 405);

  // Mejora A v2: ?fresh=1 fuerza una lectura con consistencia FUERTE del Blob
  // (sin eventual consistency) y responde sin cache. La usa el panel admin para
  // verificar que las ediciones quedaron guardadas. El sitio público sigue
  // usando la lectura normal cacheada (rápida y barata).
  const url = new URL(req.url);
  const fresh = url.searchParams.has("fresh");

  const store = fresh
    ? getStore({ name: "renatta-data", consistency: "strong" })
    : getStore("renatta-data");

  let products = await store.get("products", { type: "json" });

  // Si todavía no se inicializó, devolver array vacío (el cliente verá el catálogo embebido como fallback)
  if (!products) products = [];

  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": fresh
        ? "no-store"
        : "public, max-age=2, s-maxage=5, stale-while-revalidate=30"
    }
  });
};
