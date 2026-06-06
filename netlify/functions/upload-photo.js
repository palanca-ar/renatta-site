import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "POST") return errorResponse("method not allowed", 405);
  
  const auth = requireAuth(context);
  if (!auth.ok) return auth.response;
  
  const form = await req.formData();
  const file = form.get("file");
  const code = form.get("code");
  if (!file || !code) return errorResponse("missing 'file' or 'code'");
  
  const codeSafe = String(code).replace(/[\\/<>:"|?*]/g, "_");
  const ext = (file.name || "").split(".").pop().toLowerCase() || "png";
  const key = `photos/${codeSafe}.${ext}`;
  
  const store = getStore("renatta-photos");
  await store.set(key, await file.arrayBuffer(), {
    metadata: { uploadedBy: auth.user.email, uploadedAt: new Date().toISOString(), originalName: file.name }
  });
  
  // Update the product to mark it has a photo (with the new extension)
  const dataStore = getStore("renatta-data");
  let products = (await dataStore.get("products", { type: "json" })) || [];
  const idx = products.findIndex(p => p.code === code);
  if (idx >= 0) {
    products[idx].photo = ext;
    products[idx].code_safe = codeSafe;
    await dataStore.setJSON("products", products);
  }
  
  return jsonResponse({ ok: true, key, ext });
};
