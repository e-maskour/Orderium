#!/usr/bin/env node
// scripts/test-reports.mjs
// Lightweight smoke tester for API report endpoints.
// Usage:
//   TENANT=demo PHONE=+212662305910 PASSWORD=VQgRYDFNBeF6MN4 node scripts/test-reports.mjs

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000/api';
const TENANT = process.env.TENANT || 'demo';
const PHONE = process.env.PHONE || '+212662305910';
const PASSWORD = process.env.PASSWORD || 'VQgRYDFNBeF6MN4';
let JWT = process.env.AUTH_TOKEN || null;

const endpoints = [
  // invoices
  '/reports/invoices/journal-vente',
  '/reports/invoices/journal-achat',
  '/reports/invoices/tva-summary',
  '/reports/invoices/outstanding',
  '/reports/invoices/aging-balance',
  '/reports/invoices/journal-vente/xlsx',
  '/reports/invoices/tva-summary/xlsx',
  // sales
  '/reports/sales/revenue',
  '/reports/sales/top-products',
  '/reports/sales/by-customer',
  '/reports/sales/by-category',
  '/reports/sales/by-pos',
  '/reports/sales/revenue/xlsx',
  // stock
  '/reports/stock/valuation',
  '/reports/stock/low-stock',
  '/reports/stock/movements-journal',
  '/reports/stock/slow-dead',
  '/reports/stock/by-warehouse',
  '/reports/stock/valuation/xlsx',
  // payments
  '/reports/payments/cashflow',
  '/reports/payments/by-method',
  '/reports/payments/in-out-flow',
  '/reports/payments/cashflow/xlsx',
  // products
  '/reports/products/performance',
  '/reports/products/margin',
  '/reports/products/never-sold',
  '/reports/products/performance/xlsx',
  // purchases
  '/reports/purchases/by-period',
  '/reports/purchases/top-suppliers',
  '/reports/purchases/by-product',
  '/reports/purchases/by-period/xlsx',
  // suppliers
  '/reports/suppliers/top',
  '/reports/suppliers/aging',
  '/reports/suppliers/statement',
  '/reports/suppliers/top/xlsx',
  // clients
  '/reports/clients/top',
  '/reports/clients/aging',
  '/reports/clients/inactive',
  '/reports/clients/statement',
  '/reports/clients/top/xlsx',
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, qs = {}) {
  await delay(150);
  const url = new URL(BASE_URL + path);
  Object.entries(qs).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, String(v)));
  const headers = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT };
  if (JWT) headers.Authorization = `Bearer ${JWT}`;
  const res = await fetch(url.toString(), { method: 'GET', headers });
  const buf = await res.arrayBuffer().catch(() => null);
  const text = buf ? Buffer.from(buf).toString('utf8') : '';
  let json = null;
  try { json = JSON.parse(text); } catch (e) { /* binary/xlsx or plain text */ }
  return { status: res.status, body: json, text };
}

async function login() {
  if (JWT) return;
  console.log('Logging in...');
  const url = `${BASE_URL}/portal/login`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT }, body: JSON.stringify({ phoneNumber: PHONE, password: PASSWORD }) });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error('Login failed: ' + JSON.stringify(j));
  JWT = j?.data?.token;
  if (!JWT) throw new Error('No token returned from login');
  console.log('Authenticated.');
}

function isXlsx(path) {
  return path.endsWith('/xlsx');
}

function basicValidation(path, result) {
  if (result.status !== 200) return { ok: false, reason: `HTTP ${result.status}` };
  if (isXlsx(path)) {
    // expect binary XLSX (non-empty text may still be binary); ensure text length > 0
    if (!result.text || result.text.length < 20) return { ok: false, reason: 'empty xlsx' };
    return { ok: true };
  }
  const body = result.body;
  if (!body) return { ok: false, reason: 'no JSON body' };
  if (typeof body !== 'object') return { ok: false, reason: 'invalid body' };
  if (!('data' in body)) return { ok: false, reason: 'missing data property' };
  if (Array.isArray(body.data) && body.data.length === 0) return { ok: true, note: 'empty array (allowed)' };
  return { ok: true };
}

async function run() {
  await login();
  const results = [];

  const now = new Date();
  const endDate = now.toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);

  for (const path of endpoints) {
    console.log('\nTesting', path);
    const r1 = await request(path, {});
    const v1 = basicValidation(path, r1);
    console.log(' - default →', v1.ok ? 'OK' : 'FAIL', v1.reason || v1.note || '');

    const r2 = await request(path, { preset: 'this_month' });
    const v2 = basicValidation(path, r2);
    console.log(' - preset=this_month →', v2.ok ? 'OK' : 'FAIL', v2.reason || v2.note || '');

    const r3 = await request(path, { startDate, endDate });
    const v3 = basicValidation(path, r3);
    console.log(` - custom ${startDate}→${endDate} →`, v3.ok ? 'OK' : 'FAIL', v3.reason || v3.note || '');

    results.push({ path, checks: [v1, v2, v3] });
  }

  console.log('\nSummary:');
  let failCount = 0;
  for (const r of results) {
    const bad = r.checks.some((c) => !c.ok);
    console.log(`${bad ? '✖' : '✓'} ${r.path}`);
    if (bad) failCount++;
  }
  console.log('\nTotal endpoints:', results.length, 'failures:', failCount);
  if (failCount > 0) process.exit(2);
}

run().catch((err) => { console.error('Test run error:', err); process.exit(1); });
