import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);

  const auth = requireAuth(req);
  if (!auth.ok) return auth.response;

  const form = await req.formData();
  const file = form.get("file");
  const code = form.get("code");
  if (!file || !code) return errorResponse("missing 'file' or 'code'");

  const codeSafe = String(code).replace(/[\\/<>:"|?*]/g, "_");
  const ext = (file.name || "").split(".").pop().toLowerCase() || "png";

  // FIX bug "cambio la foto y queda la misma":
  // Las fotos originales viven en /fotos/CODIGO.png del REPO (archivos estáticos).
  // Netlify sirve los archivos del repo ANTES de caer al redirect /fotos/* -> get-photo Function.
  // Resultado: si guardábamos en Blobs con la misma key "photos/CODIGO.png", la foto del repo
  // ganaba siempre y la del usuario nunca se veía. Solución: nombre versionado con timestamp,
  // así el archivo NUEVO no existe en el repo → Netlify cae al redirect → get-photo lo sirve
  // desde Blobs. Como yapa, el browser tampoco tiene la URL nueva cacheada.
  const ts = Date.now();
  const photoKey = `${codeSafe}-v${ts}.${ext}`; // ej: "203-v1781020000.jpg"
  const key = `photos/${photoKey}`;

  const store = getStore("renatta-photos");
  await store.set(key, await file.arrayBuffer(), {
    metadata: { uploadedBy: auth.user.email, uploadedAt: new Date().toISOString(), originalName: file.name }
  });

  // Update the product. El campo .photo ahora puede ser:
  //   - Formato VIEJO: "png" / "jpg" (solo extension) → render arma fotos/CODE.ext (foto del repo)
  //   - Formato NUEVO: "203-v1781020000.jpg" (nombre completo) → render usa fotos/${photo} directo
  // Los renders detectan el formato porque el nuevo siempre incluye un punto en p.photo.
  const dataStore = getStore("renatta-data");
  // FIX RAÍZ: consistency strong evita pisar cambios concurrentes de save-product
  // (mismo race condition que tenía save-product hasta hoy).
  let products = (await dataStore.get("products", { type: "json", consistency: "strong" })) || [];
  const idx = products.findIndex(p => p.code === code);
  if (idx >= 0) {
    products[idx].photo = photoKey;
    products[idx].code_safe = codeSafe;
    await dataStore.setJSON("products", products);
  }

  return jsonResponse({ ok: true, key, photoKey, ext });
};
