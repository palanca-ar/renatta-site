import { getStore } from "@netlify/blobs";
import { requireAuth, jsonResponse, errorResponse } from "./_auth.js";

export default async (req, context) => {
  if (req.method !== "GET") return errorResponse("method not allowed", 405);
  
  const auth = requireAuth(context);
  if (!auth.ok) return auth.response;
  
  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") || "30"), 90);
  
  const store = getStore("renatta-metrics");
  const today = new Date();
  
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = `daily/${d.toISOString().slice(0,10)}`;
    let data = await store.get(key, { type: "json" });
    if (!data) data = { day: d.toISOString().slice(0,10), visits: 0, uniques: [], views: {}, cartAdds: {}, orders: 0, orderTotal: 0, hourly: {}, searches: 0 };
    daily.push(data);
  }
  
  // Aggregate
  const totalVisits = daily.reduce((s, d) => s + (d.visits || 0), 0);
  const totalOrders = daily.reduce((s, d) => s + (d.orders || 0), 0);
  const totalAmount = daily.reduce((s, d) => s + (d.orderTotal || 0), 0);
  const totalCartAdds = daily.reduce((s, d) => s + Object.values(d.cartAdds || {}).reduce((a,b) => a+b, 0), 0);
  const uniqueIPs = new Set();
  daily.forEach(d => (d.uniques || []).forEach(u => uniqueIPs.add(u)));
  
  // Top productos vistos
  const viewsByCode = {};
  daily.forEach(d => Object.entries(d.views || {}).forEach(([c, n]) => { viewsByCode[c] = (viewsByCode[c] || 0) + n; }));
  const topVisited = Object.entries(viewsByCode).sort(([,a],[,b]) => b-a).slice(0, 10).map(([code, views]) => ({ code, views }));
  
  // Top en carrito
  const cartByCode = {};
  daily.forEach(d => Object.entries(d.cartAdds || {}).forEach(([c, n]) => { cartByCode[c] = (cartByCode[c] || 0) + n; }));
  const topCart = Object.entries(cartByCode).sort(([,a],[,b]) => b-a).slice(0, 10).map(([code, adds]) => ({ code, adds }));
  
  // Horas pico
  const hourly = Object.fromEntries(Array.from({length: 24}, (_,h) => [h, 0]));
  daily.forEach(d => Object.entries(d.hourly || {}).forEach(([h, n]) => { hourly[h] = (hourly[h] || 0) + n; }));
  
  return jsonResponse({
    range: { days, from: daily[0]?.day, to: daily[daily.length-1]?.day },
    visits: { total: totalVisits, unique: uniqueIPs.size, daily: daily.map(d => ({ day: d.day, visits: d.visits, uniques: (d.uniques||[]).length })) },
    orders: { count: totalOrders, totalAmount, avg: totalOrders ? Math.round(totalAmount/totalOrders) : 0 },
    cart: { totalAdds: totalCartAdds },
    topVisited, topCart, hourly,
  });
};
