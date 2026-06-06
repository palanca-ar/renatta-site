// Helper para validar JWT de Netlify Identity y rol admin
export function requireAuth(context, requireAdmin = true) {
  const user = context?.clientContext?.user;
  if (!user) {
    return { ok: false, response: new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "content-type": "application/json" } }) };
  }
  if (requireAdmin) {
    const roles = user.app_metadata?.roles || [];
    if (!roles.includes("admin")) {
      return { ok: false, response: new Response(JSON.stringify({ error: "forbidden: requiere rol admin" }), { status: 403, headers: { "content-type": "application/json" } }) };
    }
  }
  return { ok: true, user };
}

export const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export const errorResponse = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
