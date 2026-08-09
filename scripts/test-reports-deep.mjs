#!/usr/bin/env node
// scripts/test-reports-deep.mjs
// Deeper logic checks between related report endpoints.

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const TENANT = process.env.TENANT || 'demo';
const PHONE = process.env.PHONE || '0666473116';
const PASSWORD = process.env.PASSWORD || '12345678';
let JWT = process.env.AUTH_TOKEN || null;

async function fetchJson(path, qs = {}) {
  const url = new URL(BASE_URL + path);
  Object.entries(qs).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
  const headers = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT };
  if (JWT) headers.Authorization = `Bearer ${JWT}`;
  const res = await fetch(url.toString(), { method: 'GET', headers });
  const j = await res.json().catch(() => null);
  return { status: res.status, body: j };
}

async function postJson(path, data) {
  const url = BASE_URL + path;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT }, body: JSON.stringify(data) });
  return await res.json().catch(() => null);
}

async function login() {
  if (JWT) return;
  const url = `${BASE_URL}/portal/login`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT }, body: JSON.stringify({ phoneNumber: PHONE, password: PASSWORD }) });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error('Login failed: ' + JSON.stringify(j));
  JWT = j?.data?.token;
}

function sumNumeric(obj) {
  if (obj == null) return 0;
  if (typeof obj === 'number') return obj;
  if (Array.isArray(obj)) return obj.reduce((s, v) => s + sumNumeric(v), 0);
  if (typeof obj === 'object') return Object.values(obj).reduce((s, v) => s + sumNumeric(v), 0);
  return 0;
}

function findKey(obj, keys) {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) if (k in obj) return obj[k];
  // search nested arrays/objects
  for (const v of Object.values(obj)) {
    const found = findKey(v, keys);
    if (found !== undefined) return found;
  }
  return undefined;
}

function approxEqual(a, b, tol = 1e-6) {
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= Math.max(tol, Math.abs(a) * 1e-6);
}

async function runChecks() {
  await login();
  const filter = { preset: 'this_month' };

  const revenueRes = await fetchJson('/reports/sales/revenue', filter);
  const byCatRes = await fetchJson('/reports/sales/by-category', filter);
  const topProductsRes = await fetchJson('/reports/sales/top-products', filter);

  const invoicesOutstanding = await fetchJson('/reports/invoices/outstanding', filter);
  const invoicesAging = await fetchJson('/reports/invoices/aging-balance', { asOfDate: new Date().toISOString().slice(0, 10) });

  const paymentsCashflow = await fetchJson('/reports/payments/cashflow', filter);

  // normalize responses to data objects
  const rev = revenueRes.body?.data ?? revenueRes.body;
  const byCat = byCatRes.body?.data ?? byCatRes.body;
  const topProducts = topProductsRes.body?.data ?? topProductsRes.body;
  const out = invoicesOutstanding.body?.data ?? invoicesOutstanding.body;
  const aging = invoicesAging.body?.data ?? invoicesAging.body;
  const cashflow = paymentsCashflow.body?.data ?? paymentsCashflow.body;

  const results = [];

  // Check: sum(by-category revenues) == revenue total
  // Prefer explicit rows with totalRevenue/total fields, otherwise fallback to kpis or numeric sum
  const extractRowsSum = (obj, fieldNames) => {
    const rows = obj?.rows ?? obj?.data ?? obj?.items ?? null;
    if (Array.isArray(rows)) return rows.reduce((s, it) => s + (Number(findKey(it, fieldNames) || 0) || 0), 0);
    // try chart.series first
    if (obj?.chart?.series) {
      const series = obj.chart.series[0];
      if (series?.data) return series.data.reduce((s, v) => s + Number(v || 0), 0);
    }
    // try kpis
    const k = obj?.kpis ?? obj;
    const kVal = findKey(k, fieldNames);
    if (kVal !== undefined) return Number(kVal) || 0;
    return sumNumeric(obj);
  };

  const byCatSum = extractRowsSum(byCat, ['totalRevenue', 'total', 'amount', 'revenue']);
  const revenueTotal = extractRowsSum(rev, ['totalRevenue', 'total', 'revenue', 'amount', 'net']);
  const check1 = { name: 'sales.byCategory == sales.revenue', ok: approxEqual(byCatSum, revenueTotal), byCatSum, revenueTotal };
  results.push(check1);

  // Check: sum(aging buckets) == outstanding total
  const agingSum = Array.isArray(aging?.buckets ?? aging)
    ? (aging.buckets ?? aging).reduce((s, b) => s + (Number(b.amount ?? b.total ?? 0) || 0), 0)
    : sumNumeric(aging);
  const outstandingTotal = Number(findKey(out, ['total', 'outstanding', 'amount'])) || sumNumeric(out);
  results.push({ name: 'invoices.aging == invoices.outstanding', ok: approxEqual(agingSum, outstandingTotal), agingSum, outstandingTotal });

  // Check: topProducts revenue sum <= revenue total
  const topProdSum = extractRowsSum(topProducts, ['totalRevenue', 'total', 'revenue', 'amount']);
  const check3 = { name: 'topProducts.revenue <= revenue.total', ok: topProdSum <= revenueTotal + 1e-6, topProdSum, revenueTotal };
  results.push(check3);

  // Check: cashflow inflows - outflows equals net change if present
  const inflows = Number(findKey(cashflow, ['inflows', 'encaissements', 'receipts'])) || sumNumeric(cashflow?.inflows ?? {});
  const outflows = Number(findKey(cashflow, ['outflows', 'decaissements', 'payments'])) || sumNumeric(cashflow?.outflows ?? {});
  const net = Number(findKey(cashflow, ['net', 'balance'])) || (inflows - outflows);
  results.push({ name: 'cashflow.net == inflows - outflows', ok: approxEqual(net, inflows - outflows), inflows, outflows, net });

  // Print results
  console.log('\nDeep validation results:');
  let failures = 0;
  for (const r of results) {
    if (r.ok) console.log('✓', r.name);
    else {
      console.log('✖', r.name, JSON.stringify(r));
      failures++;
      // print raw payloads for failed sales checks
      if (r.name.includes('sales')) {
        console.log('\n--- RAW revenue response ---');
        console.log(JSON.stringify(rev, null, 2));
        console.log('\n--- RAW by-category response ---');
        console.log(JSON.stringify(byCat, null, 2));
        console.log('\n--- RAW top-products response ---');
        console.log(JSON.stringify(topProducts, null, 2));
      }
    }
  }
  console.log('\nTotal checks:', results.length, 'failures:', failures);
  if (failures > 0) process.exit(2);
}

runChecks().catch((e) => { console.error('Error during deep checks:', e); process.exit(1); });
