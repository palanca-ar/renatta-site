// Helper para validar JWT de Netlify Identity (lo inyecta el runtime)
export function requireAuth(context) {
  const user = context?.clientContext?.user;
  if (!user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } }) };
  }
  return { ok: true, user };
}

export const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export const errorResponse = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
