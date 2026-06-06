import { getStore } from "@netlify/blobs";
import { jsonResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "GET") return jsonResponse({ error: "method not allowed" }, 405);
  
  const store = getStore("renatta-data");
  let products = await store.get("products", { type: "json" });
  
  // Si todavía no se inicializó, devolver array vacío (el cliente verá el catálogo embebido como fallback)
  if (!products) products = [];
  
  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
    }
  });
};
