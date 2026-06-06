// Parsear JWT y validar rol. Funciones v2 no pueblan clientContext.user automáticamente,
// así que parseamos el header Authorization manualmente.

function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // base64url decode
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(parts[1].length + (4 - parts[1].length % 4) % 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function requireAuth(reqOrContext, requireAdminOrUndefined) {
  // Manejar firma vieja: requireAuth(context) vs nueva: requireAuth(req, requireAdmin)
  let req, requireAdmin;
  if (reqOrContext && typeof reqOrContext.headers?.get === 'function') {
    req = reqOrContext;
    requireAdmin = requireAdminOrUndefined !== false;
  } else {
    // Legacy: era context, pero ya no tenemos forma de obtener req. Asumir requiere admin.
    return { ok: false, response: errorResponse("unauthorized", 401) };
  }
  
  const authHeader = req.headers.get('authorization') || '';
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return { ok: false, response: errorResponse("missing Bearer token", 401) };
  }
  
  const payload = decodeJWT(m[1]);
  if (!payload) {
    return { ok: false, response: errorResponse("invalid JWT", 401) };
  }
  
  // Validar expiración
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    return { ok: false, response: errorResponse("token expired", 401) };
  }
  
  if (requireAdmin) {
    const roles = payload.app_metadata?.roles || [];
    if (!roles.includes("admin")) {
      return { ok: false, response: errorResponse("forbidden: requiere rol admin", 403) };
    }
  }
  
  return { ok: true, user: { email: payload.email, id: payload.sub, app_metadata: payload.app_metadata, user_metadata: payload.user_metadata } };
}

export const jsonResponse = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

export const errorResponse = (msg, status = 400) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
