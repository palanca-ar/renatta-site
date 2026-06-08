// Sirve fotos desde Netlify Blobs.
// Se invoca via redirect: /fotos/CODIGO.ext -> /.netlify/functions/get-photo?file=CODIGO.ext
// Como el redirect tiene status 200, Netlify primero busca el archivo estático en /fotos/
// y solo cae acá si no existe (las fotos cargadas en el seed se siguen sirviendo del CDN del repo,
// y las fotos nuevas subidas por Renatta caen acá desde Blobs).

import { getStore } from "@netlify/blobs";

const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export default async (req) => {
  const url = new URL(req.url);
  // El redirect manda ?file=CODIGO.ext o el path en URL
  let file = url.searchParams.get("file");
  if (!file) {
    // fallback: extraer del pathname (último segmento)
    const parts = url.pathname.split("/");
    file = parts[parts.length - 1];
  }
  if (!file) return new Response("missing file", { status: 400 });

  // Sanitizar: solo permitir caracteres seguros
  file = file.replace(/[^a-zA-Z0-9._-]/g, "");
  if (!file.includes(".")) return new Response("invalid file", { status: 400 });

  const ext = file.split(".").pop().toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";

  try {
    const store = getStore("renatta-photos");
    const key = `photos/${file}`;
    const blob = await store.get(key, { type: "arrayBuffer" });
    if (!blob) {
      return new Response("not found", { status: 404 });
    }
    return new Response(blob, {
      status: 200,
      headers: {
        "content-type": mime,
        // Cache 1 hora en navegador, 1 día en edge, stale-while-revalidate 7 días
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (e) {
    return new Response("internal error: " + e.message, { status: 500 });
  }
};
