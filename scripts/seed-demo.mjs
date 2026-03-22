#!/usr/bin/env node
/**
 * seed-demo.mjs — Orderium Demo Data Seeder
 *
 * Populates the demo tenant via REST API with:
 *   - 5  product categories
 *   - 100 products (real Moroccan grocery data + 20 Arabic names) with images
 *   - 20 Moroccan clients  (10 individual + 10 companies with ICE)
 *   - 20 Moroccan fournisseurs (10 individual + 10 companies with ICE)
 *   - 5  Livreurs (delivery drivers)
 *   - Stock receipt movements for 60 random products
 *   - 10 Devis (quotes), 10 Bons de Livraison (orders), 10 Factures (invoices)
 *   - Payments: 4 full, 3 partial, 3 unpaid
 *
 * Usage:  node scripts/seed-demo.mjs
 */

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:3000/api';
const TENANT = 'demo';
const PHONE = '+212662305910';
const PASSWORD = 'VQgRYDFNBeF6MN4';

// ─── API helper (with throttle delay + 429 retry) ────────────────────────────

let JWT = null;
const DELAY_MS = 1100; // 1.1s between calls → ~0.9 req/s, under 60 req/min throttle limit

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function api(method, path, body = null) {
    await sleep(DELAY_MS);
    const url = `${BASE_URL}${path}`;
    const headers = { 'Content-Type': 'application/json', 'X-Tenant-ID': TENANT };
    if (JWT) headers['Authorization'] = `Bearer ${JWT}`;
    const opts = { method, headers, body: body ? JSON.stringify(body) : undefined };

    let res = await fetch(url, opts);

    // Retry once on 429
    if (res.status === 429) {
        await sleep(2000);
        res = await fetch(url, opts);
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    if (!res.ok) console.warn(`  ⚠️  ${method} ${path} → ${res.status}: ${text.slice(0, 200)}`);
    return json;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max) { return +(Math.random() * (max - min) + min).toFixed(2); }
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }
function sample(arr, n) { return shuffle(arr).slice(0, n); }
function today(off = 0) { const d = new Date(); d.setDate(d.getDate() + off); return d.toISOString().split('T')[0]; }
function fmtMAD(n) { return n.toFixed(2) + ' MAD'; }

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES = [
    { name: 'Épicerie Salée', description: 'Conserves, huiles, sauces, condiments' },
    { name: 'Épicerie Sucrée', description: 'Confitures, miels, farines, pâtisserie' },
    { name: 'Petit Déjeuner', description: 'Thés, cafés, miels, céréales' },
    { name: 'Boissons', description: 'Eaux minérales, sodas, jus' },
    { name: 'منتجات عربية', description: 'Produits avec noms en arabe' },
];

// ─── Product images (reliable public URLs) ────────────────────────────────────
// Using picsum.photos with seed for deterministic, always-available images  
// plus a few known Shopify CDN links that were verified working

const IMG = {
    // Generic food-style placeholder images (always available)
    olive_oil: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
    canned_tuna: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
    sauce: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=400&h=400&fit=crop',
    soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=400&fit=crop',
    salt: 'https://images.unsplash.com/photo-1518110925495-5fe2c8b2be84?w=400&h=400&fit=crop',
    oil: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400&h=400&fit=crop',
    honey: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=400&fit=crop',
    jam: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop',
    flour: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
    tea: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
    coffee: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
    sugar: 'https://images.unsplash.com/photo-1581268559703-17c438df7af5?w=400&h=400&fit=crop',
    water: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop',
    soda: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&h=400&fit=crop',
    milk: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
    chocolate: 'https://images.unsplash.com/photo-1481391319762-47dff72954d9?w=400&h=400&fit=crop',
    spices: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=400&fit=crop',
    rice: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
    lentils: 'https://images.unsplash.com/photo-1585996839961-e6f3296addf9?w=400&h=400&fit=crop',
    butter: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop',
    popcorn: 'https://images.unsplash.com/photo-1585238341710-4d3ff484184d?w=400&h=400&fit=crop',
    spread: 'https://images.unsplash.com/photo-1612187209234-a05e193a9cca?w=400&h=400&fit=crop',
    dates: 'https://images.unsplash.com/photo-1596515554506-8fda3f2971c8?w=400&h=400&fit=crop',
    couscous: 'https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=400&h=400&fit=crop',
    tomato_paste: 'https://images.unsplash.com/photo-1546554137-f86b9593a222?w=400&h=400&fit=crop',
    yeast: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    bread: 'https://images.unsplash.com/photo-1549931319-a545753d62ce?w=400&h=400&fit=crop',
    cereal: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=400&h=400&fit=crop',
    juice: 'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=400&h=400&fit=crop',
    quinoa: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
};

// ─── Products (100) — Each with name, price, cost, image, and category index ──

const PRODUCTS = [
    // ── cat 0: Épicerie Salée (20 products) ─────────────────────────
    { name: 'Thon entier à l\'huile Tam 800G', price: 78.00, cost: 55.00, img: IMG.canned_tuna, cat: 0 },
    { name: 'Thon entier à l\'huile Tam 400G', price: 39.00, cost: 28.00, img: IMG.canned_tuna, cat: 0 },
    { name: 'Huile d\'olive vierge Sfassif 1L', price: 59.95, cost: 42.00, img: IMG.olive_oil, cat: 0 },
    { name: 'Huile d\'olive extra vierge Sfassif 500ml', price: 75.90, cost: 54.00, img: IMG.olive_oil, cat: 0 },
    { name: 'Sauce Pizza Épicée Star 37CL', price: 20.00, cost: 13.50, img: IMG.sauce, cat: 0 },
    { name: 'Moutarde au Miel Star 21CL', price: 13.90, cost: 9.00, img: IMG.sauce, cat: 0 },
    { name: 'Vinaigrette Star Original 50CL', price: 17.50, cost: 11.00, img: IMG.sauce, cat: 0 },
    { name: 'Vinaigrette Basilic Star 50CL', price: 17.95, cost: 11.50, img: IMG.sauce, cat: 0 },
    { name: 'Potage Tomate Vermicelle Ideal', price: 7.90, cost: 5.00, img: IMG.soup, cat: 0 },
    { name: 'Potage Poisson Ideal', price: 7.90, cost: 5.00, img: IMG.soup, cat: 0 },
    { name: 'Harira Complète Ideal 135g', price: 12.50, cost: 8.00, img: IMG.soup, cat: 0 },
    { name: 'Gros Sel de Mer La Baleine 600g', price: 22.90, cost: 15.00, img: IMG.salt, cat: 0 },
    { name: 'Sel Fin de Mer La Baleine 250g', price: 16.90, cost: 11.00, img: IMG.salt, cat: 0 },
    { name: 'Huile de Cuisson Hala Premium 2L', price: 36.50, cost: 25.00, img: IMG.oil, cat: 0 },
    { name: 'Huile Friture Spéciale Hala Chef 1L', price: 17.69, cost: 12.00, img: IMG.oil, cat: 0 },
    { name: 'Huile de Cuisson Hala Premium 500ml', price: 8.90, cost: 6.00, img: IMG.oil, cat: 0 },
    { name: 'Filet de Thon Goldy 1.7KG', price: 160.00, cost: 115.00, img: IMG.canned_tuna, cat: 0 },
    { name: 'Sauce Samouraï Nawhal\'s 500ml', price: 69.90, cost: 48.00, img: IMG.sauce, cat: 0 },
    { name: 'Quinoa Tipiak 2x120g', price: 45.95, cost: 32.00, img: IMG.quinoa, cat: 0 },
    { name: 'Popcorn Beurre Maison 3x80g', price: 31.90, cost: 22.00, img: IMG.popcorn, cat: 0 },

    // ── cat 1: Épicerie Sucrée (20 products) ────────────────────────
    { name: 'Lait Amande Vegan Helior 1L', price: 29.90, cost: 20.00, img: IMG.milk, cat: 1 },
    { name: 'Lait Coco Helior 1L', price: 29.90, cost: 20.00, img: IMG.milk, cat: 1 },
    { name: 'Lait Noisette Helior 1L', price: 29.90, cost: 20.00, img: IMG.milk, cat: 1 },
    { name: 'Poudre Cacao Chocao 100G', price: 4.95, cost: 3.20, img: IMG.chocolate, cat: 1 },
    { name: 'Préparation Flan Vanille Ideal 4x50g', price: 39.90, cost: 27.00, img: IMG.sugar, cat: 1 },
    { name: 'Préparation Flan Chocolat Ideal 4x50g', price: 39.90, cost: 27.00, img: IMG.chocolate, cat: 1 },
    { name: 'Miel El Baraka 430g', price: 14.90, cost: 10.00, img: IMG.honey, cat: 1 },
    { name: 'Maïzena Mayfine Ideal 180g', price: 7.90, cost: 5.20, img: IMG.flour, cat: 1 },
    { name: 'Confiture Fraise El Baraka 37cl', price: 19.95, cost: 13.50, img: IMG.jam, cat: 1 },
    { name: 'Raib en Poudre Ideal 40g', price: 3.49, cost: 2.20, img: IMG.milk, cat: 1 },
    { name: 'Sucre Vanillé Ideal 10 sachets 75G', price: 5.50, cost: 3.50, img: IMG.sugar, cat: 1 },
    { name: 'Pâte à Tartiner Biscoff Lotus 400g', price: 58.90, cost: 42.00, img: IMG.spread, cat: 1 },
    { name: 'Farine Luxe Anfa 5kg', price: 25.00, cost: 17.00, img: IMG.flour, cat: 1 },
    { name: 'Farine Luxe Anfa 10kg', price: 49.90, cost: 34.00, img: IMG.flour, cat: 1 },
    { name: 'Levure Sèche Sboula 125g', price: 9.00, cost: 6.00, img: IMG.yeast, cat: 1 },
    { name: 'Confiture Abricot El Baraka 37cl', price: 14.90, cost: 10.00, img: IMG.jam, cat: 1 },
    { name: 'Confiture Orange El Baraka 37cl', price: 14.90, cost: 10.00, img: IMG.jam, cat: 1 },
    { name: 'Sucre Glace Idéal 200g', price: 6.50, cost: 4.00, img: IMG.sugar, cat: 1 },
    { name: 'Chocolat en Poudre Idéal 250g', price: 12.90, cost: 8.50, img: IMG.chocolate, cat: 1 },
    { name: 'Sirop de Grenadine Star 75cl', price: 24.90, cost: 17.00, img: IMG.juice, cat: 1 },

    // ── cat 2: Petit Déjeuner (20 products) ─────────────────────────
    { name: 'Thé Jaune Chakour 200G', price: 18.90, cost: 12.00, img: IMG.tea, cat: 2 },
    { name: 'Miel Al Niema boîte métallique 800g', price: 67.50, cost: 48.00, img: IMG.honey, cat: 2 },
    { name: 'Confiture Pêche St Dalfour 284G', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture 4 Fruits St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture Fraise St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture Mûres St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture Cerises Noires St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture Airelles Myrtilles St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Confiture Mangue Passion St Dalfour 284g', price: 53.90, cost: 38.00, img: IMG.jam, cat: 2 },
    { name: 'Pain Multigrain Schär 250g', price: 35.00, cost: 24.00, img: IMG.bread, cat: 2 },
    { name: 'Sucre Canne Brun Morceaux 1KG', price: 59.95, cost: 42.00, img: IMG.sugar, cat: 2 },
    { name: 'Sucre Canne Saint Louis bec verseur 650g', price: 47.90, cost: 33.00, img: IMG.sugar, cat: 2 },
    { name: 'Canderel Sucre Poudre 40g', price: 49.90, cost: 35.00, img: IMG.sugar, cat: 2 },
    { name: 'Canderel Briquet 100 comprimés 8.5g', price: 42.90, cost: 30.00, img: IMG.sugar, cat: 2 },
    { name: 'Miel Sedra 450g (Verre)', price: 20.00, cost: 13.50, img: IMG.honey, cat: 2 },
    { name: 'Thé Zine 200g', price: 23.16, cost: 16.00, img: IMG.tea, cat: 2 },
    { name: 'Thé Zine 500g', price: 57.60, cost: 40.00, img: IMG.tea, cat: 2 },
    { name: 'Café Moulu Bonno 250g', price: 27.90, cost: 19.00, img: IMG.coffee, cat: 2 },
    { name: 'Céréales Fitness Nestlé 375g', price: 42.90, cost: 30.00, img: IMG.cereal, cat: 2 },
    { name: 'Confiture Abricot St Dalfour 28g mini', price: 9.50, cost: 6.50, img: IMG.jam, cat: 2 },

    // ── cat 3: Boissons (20 products) ───────────────────────────────
    { name: 'Sidi Ali Eau Minérale 6x1.5L', price: 24.90, cost: 18.00, img: IMG.water, cat: 3 },
    { name: 'Ain Atlas Eau Minérale 2x5L', price: 25.00, cost: 18.00, img: IMG.water, cat: 3 },
    { name: 'Sidi Ali Eau Minérale 12x50cl', price: 24.99, cost: 18.00, img: IMG.water, cat: 3 },
    { name: 'Ain Saiss Eau Minérale 2x5L', price: 27.00, cost: 19.00, img: IMG.water, cat: 3 },
    { name: 'Sidi Ali Eau Minérale 12x33cl', price: 19.30, cost: 14.00, img: IMG.water, cat: 3 },
    { name: 'Ain Ifrane Eau Minérale 6x1.5L', price: 27.95, cost: 20.00, img: IMG.water, cat: 3 },
    { name: 'Ain Ifrane Eau Minérale 2x5L', price: 25.00, cost: 18.00, img: IMG.water, cat: 3 },
    { name: 'Bahia Eau de Table 2x5L', price: 22.00, cost: 16.00, img: IMG.water, cat: 3 },
    { name: 'Oulmes Eau Gazeuse 12x33cl', price: 54.50, cost: 39.00, img: IMG.water, cat: 3 },
    { name: 'Oulmes Eau Gazeuse 6x1L', price: 43.80, cost: 31.00, img: IMG.water, cat: 3 },
    { name: 'Ain Saiss Eau Minérale 6x1.5L', price: 34.00, cost: 24.00, img: IMG.water, cat: 3 },
    { name: 'Coca Cola Zero 25cl', price: 4.90, cost: 3.20, img: IMG.soda, cat: 3 },
    { name: 'Coca Cola Classic 1.3L', price: 14.57, cost: 10.00, img: IMG.soda, cat: 3 },
    { name: 'Ain Atlas Eau Minérale 6x1.5L', price: 30.00, cost: 21.00, img: IMG.water, cat: 3 },
    { name: 'Sidi Ali Eau Minérale 4x2L', price: 21.90, cost: 16.00, img: IMG.water, cat: 3 },
    { name: 'Coca Cola Zero 1L', price: 8.50, cost: 5.80, img: IMG.soda, cat: 3 },
    { name: 'Ain Saiss Eau Minérale 12x50cl', price: 36.00, cost: 26.00, img: IMG.water, cat: 3 },
    { name: 'Coca Cola Classic Canette 25cl', price: 5.50, cost: 3.80, img: IMG.soda, cat: 3 },
    { name: 'Ain Ifrane Eau Minérale 12x50cl', price: 35.00, cost: 25.00, img: IMG.water, cat: 3 },
    { name: 'Jus Orange Pressé Valencia 1L', price: 18.90, cost: 13.00, img: IMG.juice, cat: 3 },

    // ── cat 4: منتجات عربية — Arabic names (20 products) ──────────
    { name: 'سكر أبيض 1 كيلو', price: 12.00, cost: 7.50, img: IMG.sugar, cat: 4 },
    { name: 'شاي أتاي مغربي 200 غرام', price: 25.00, cost: 16.00, img: IMG.tea, cat: 4 },
    { name: 'زيت الزيتون البكر 1 لتر', price: 65.00, cost: 45.00, img: IMG.olive_oil, cat: 4 },
    { name: 'عسل طبيعي أصيل 500 غرام', price: 85.00, cost: 58.00, img: IMG.honey, cat: 4 },
    { name: 'تمر المدينة 1 كغ', price: 45.00, cost: 30.00, img: IMG.dates, cat: 4 },
    { name: 'كسكس متوسط 1 كغ', price: 22.00, cost: 14.00, img: IMG.couscous, cat: 4 },
    { name: 'حريسة تقليدية 380 غرام', price: 18.50, cost: 12.00, img: IMG.sauce, cat: 4 },
    { name: 'دقيق الفرينة 5 كغ', price: 28.00, cost: 18.00, img: IMG.flour, cat: 4 },
    { name: 'بهارات مشكلة 100 غرام', price: 15.00, cost: 9.50, img: IMG.spices, cat: 4 },
    { name: 'قهوة عربية محمصة 250 غرام', price: 55.00, cost: 38.00, img: IMG.coffee, cat: 4 },
    { name: 'عدس أحمر 500 غرام', price: 14.00, cost: 9.00, img: IMG.lentils, cat: 4 },
    { name: 'حمص مجفف 500 غرام', price: 12.00, cost: 7.50, img: IMG.lentils, cat: 4 },
    { name: 'خميرة المخبز 125 غرام', price: 9.00, cost: 6.00, img: IMG.yeast, cat: 4 },
    { name: 'زبدة بلدية 500 غرام', price: 55.00, cost: 38.00, img: IMG.butter, cat: 4 },
    { name: 'ملح بحري 600 غرام', price: 12.00, cost: 7.50, img: IMG.salt, cat: 4 },
    { name: 'رز مصري 5 كغ', price: 65.00, cost: 45.00, img: IMG.rice, cat: 4 },
    { name: 'مربى التين 370 مل', price: 19.00, cost: 12.50, img: IMG.jam, cat: 4 },
    { name: 'سمنة بلدية 500 غرام', price: 48.00, cost: 33.00, img: IMG.butter, cat: 4 },
    { name: 'شوكولاتة بالحليب 200 غرام', price: 35.00, cost: 24.00, img: IMG.chocolate, cat: 4 },
    { name: 'معجون الطماطم 800 غرام', price: 14.00, cost: 9.00, img: IMG.tomato_paste, cat: 4 },
];

// ─── Clients ──────────────────────────────────────────────────────────────────

const STREETS = ['Rue Hassan II', 'Avenue Mohammed V', 'Boulevard Zerktouni', 'Rue des FAR', 'Avenue des Nations Unies', 'Rue de la Liberté', 'Boulevard Anfa', 'Rue Moulay Youssef', 'Avenue Al Massira', 'Rue Ibn Rochd'];
function addr(city) { return `${rand(1, 200)} ${pick(STREETS)}, ${city}`; }

const CLIENTS_INDIVIDUAL = [
    { name: 'Ahmed Benali', phone: '+212661234567', city: 'Casablanca' },
    { name: 'Fatima Zahra El Amrani', phone: '+212662345678', city: 'Rabat' },
    { name: 'Mohamed Rachid Ouali', phone: '+212663456789', city: 'Marrakech' },
    { name: 'Khadija Berrada', phone: '+212664567890', city: 'Fès' },
    { name: 'Youssef Chakiri', phone: '+212665678901', city: 'Meknès' },
    { name: 'Asmae Bennani', phone: '+212666789012', city: 'Agadir' },
    { name: 'Abderrahim Tahiri', phone: '+212667890123', city: 'Tanger' },
    { name: 'Nadia Filali', phone: '+212668901234', city: 'Oujda' },
    { name: 'Omar Slimani', phone: '+212669012345', city: 'Salé' },
    { name: 'Soumia Kadiri', phone: '+212660123456', city: 'Tétouan' },
];

const CLIENTS_COMPANIES = [
    { name: 'SARL Maroc Commerce', phone: '+212522123456', ice: '001234567890001', city: 'Casablanca' },
    { name: 'SA Distribution Atlas', phone: '+212522234567', ice: '001234567890002', city: 'Casablanca' },
    { name: 'SARLAU Tanger Trade', phone: '+212539123456', ice: '001234567890003', city: 'Tanger' },
    { name: 'GIE Maroc Export', phone: '+212537234567', ice: '001234567890004', city: 'Rabat' },
    { name: 'SARL Fès Industries', phone: '+212535345678', ice: '001234567890005', city: 'Fès' },
    { name: 'SA Marrakech Distribution', phone: '+212524456789', ice: '001234567890006', city: 'Marrakech' },
    { name: 'GIE Agadir Commerce', phone: '+212528567890', ice: '001234567890007', city: 'Agadir' },
    { name: 'SARL Rabat Tech', phone: '+212537678901', ice: '001234567890008', city: 'Rabat' },
    { name: 'SA Meknès Trading', phone: '+212535789012', ice: '001234567890009', city: 'Meknès' },
    { name: 'SARLAU Oujda Business', phone: '+212536890123', ice: '001234567890010', city: 'Oujda' },
];

// ─── Fournisseurs ─────────────────────────────────────────────────────────────

const SUPPLIERS_INDIVIDUAL = [
    { name: 'Hassan Moutaouakil', phone: '+212671234567', city: 'Casablanca' },
    { name: 'Laila Bensouda', phone: '+212672345678', city: 'Rabat' },
    { name: 'Karim Alaoui', phone: '+212673456789', city: 'Marrakech' },
    { name: 'Zineb Chraibi', phone: '+212674567890', city: 'Fès' },
    { name: 'Tariq Mansouri', phone: '+212675678901', city: 'Meknès' },
    { name: 'Houda Fassi', phone: '+212676789012', city: 'Agadir' },
    { name: 'Rachid Lahlou', phone: '+212677890123', city: 'Tanger' },
    { name: 'Samira Benkirane', phone: '+212678901234', city: 'El Jadida' },
    { name: 'Amine Cherkaoui', phone: '+212679012345', city: 'Kénitra' },
    { name: 'Wafa El Khatib', phone: '+212670123456', city: 'Béni Mellal' },
];

const SUPPLIERS_COMPANIES = [
    { name: 'SARL Import Atlas', phone: '+212522901234', ice: '002234567890001', city: 'Casablanca' },
    { name: 'SA Grossiste Maroc', phone: '+212522812345', ice: '002234567890002', city: 'Casablanca' },
    { name: 'SARLAU Fournisseur Royal', phone: '+212539723456', ice: '002234567890003', city: 'Tanger' },
    { name: 'GIE Trans Maroc', phone: '+212537634567', ice: '002234567890004', city: 'Rabat' },
    { name: 'SARL Casablanca Supply', phone: '+212522545678', ice: '002234567890005', city: 'Casablanca' },
    { name: 'SA Nord Maroc Imports', phone: '+212539456789', ice: '002234567890006', city: 'Tanger' },
    { name: 'GIE Sud Maroc Commerce', phone: '+212528367890', ice: '002234567890007', city: 'Agadir' },
    { name: 'SARL Centre Distribution', phone: '+212537278901', ice: '002234567890008', city: 'Rabat' },
    { name: 'SA Orient Trading', phone: '+212536189012', ice: '002234567890009', city: 'Oujda' },
    { name: 'SARLAU Maghreb Imports', phone: '+212536090123', ice: '002234567890010', city: 'Nador' },
];

// ─── Livreurs ─────────────────────────────────────────────────────────────────

const LIVREURS = [
    { name: 'Ahmed Livreur', phoneNumber: '+212691234567', email: 'ahmed.livreur@orderium.ma', password: 'Livraison1!' },
    { name: 'Rachid Express', phoneNumber: '+212692345678', email: 'rachid.express@orderium.ma', password: 'Livraison2!' },
    { name: 'Omar Dispatch', phoneNumber: '+212693456789', email: 'omar.dispatch@orderium.ma', password: 'Livraison3!' },
    { name: 'Yassine Delivery', phoneNumber: '+212694567890', email: 'yassine.delivery@orderium.ma', password: 'Livraison4!' },
    { name: 'Hamid Fast', phoneNumber: '+212695678901', email: 'hamid.fast@orderium.ma', password: 'Livraison5!' },
];

// ─── Logging ──────────────────────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function step(msg) { console.log(`\n${'─'.repeat(60)}\n🔷  ${msg}`); }
function ok(msg) { console.log(`  ✅  ${msg}`); }
function warn(msg) { console.log(`  ⚠️   ${msg}`); }

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
    log(`\n${'═'.repeat(60)}`);
    log('🌱  Orderium Demo Seeder — v2');
    log(`    Tenant: ${TENANT} | API: ${BASE_URL}`);
    log(`    ${PRODUCTS.length} products across ${CATEGORIES.length} categories`);
    log(`${'═'.repeat(60)}`);

    // ── 1. Authenticate ─────────────────────────────────────────────
    step('1/11 — Authenticating');
    const loginRes = await api('POST', '/portal/login', { phoneNumber: PHONE, password: PASSWORD });
    if (!loginRes?.data?.token) { console.error('❌  Login failed:', JSON.stringify(loginRes)); process.exit(1); }
    JWT = loginRes.data.token;
    ok(`Logged in as ${PHONE}`);

    // ── 2. Warehouse ────────────────────────────────────────────────
    step('2/11 — Ensuring warehouse exists');
    const whListRes = await api('GET', '/inventory/warehouses');
    let warehouseId = whListRes?.data?.[0]?.id;
    if (!warehouseId) {
        const whRes = await api('POST', '/inventory/warehouses', {
            name: 'Dépôt Principal', code: 'WH-MAIN',
            address: '15 Zone Industrielle, Casablanca', city: 'Casablanca',
            phoneNumber: '+212522000001', managerName: 'Directeur Stock', isActive: true,
        });
        warehouseId = whRes?.data?.id;
    }
    if (!warehouseId) { console.error('❌ Warehouse fail'); process.exit(1); }
    ok(`Warehouse ID: ${warehouseId}`);

    // ── 3. Create categories ────────────────────────────────────────
    step('3/11 — Creating product categories');
    const categoryIds = []; // index matches CATEGORIES array

    for (const cat of CATEGORIES) {
        const res = await api('POST', '/categories', {
            name: cat.name, description: cat.description, type: 'product', isActive: true,
        });
        const id = res?.data?.id;
        if (id) { categoryIds.push(id); ok(`Category: ${cat.name} (id: ${id})`); }
        else { warn(`Category "${cat.name}" failed`); categoryIds.push(null); }
    }
    ok(`${categoryIds.filter(Boolean).length}/${CATEGORIES.length} categories created`);

    // ── 4. Create products ──────────────────────────────────────────
    step(`4/11 — Creating ${PRODUCTS.length} products`);
    const productIds = [];
    const productMap = [];

    for (let i = 0; i < PRODUCTS.length; i++) {
        const p = PRODUCTS[i];
        const catId = categoryIds[p.cat];
        const body = {
            name: p.name,
            price: p.price,
            cost: p.cost,
            description: `Réf. PRD-${String(i + 1).padStart(3, '0')}`,
            isService: false,
            isEnabled: true,
            defaultTax: 20,
            saleTax: 20,
            purchaseTax: 20,
            imageUrl: p.img,
            warehouseId,
        };
        if (catId) body.categoryIds = [catId];

        const res = await api('POST', '/products/create', body);
        const id = res?.data?.id;
        if (id) {
            productIds.push(id);
            productMap.push({ id, name: p.name, price: p.price });
            process.stdout.write(`\r  📦  Products: ${productIds.length}/${PRODUCTS.length}  `);
        } else {
            warn(`Product "${p.name}" failed`);
        }
    }
    log(''); ok(`${productIds.length}/${PRODUCTS.length} products created`);

    // ── 5. Create 20 clients ────────────────────────────────────────
    step('5/11 — Creating 20 Moroccan clients');
    const clientIds = [];

    for (const c of CLIENTS_INDIVIDUAL) {
        const res = await api('POST', '/partners', {
            name: c.name, phoneNumber: c.phone, address: addr(c.city),
            isCustomer: true, isSupplier: false, isCompany: false, isEnabled: true,
        });
        const id = res?.data?.id;
        if (id) { clientIds.push(id); ok(`Client: ${c.name}`); }
        else warn(`Client "${c.name}" failed`);
    }

    for (const c of CLIENTS_COMPANIES) {
        const res = await api('POST', '/partners', {
            name: c.name, phoneNumber: c.phone, address: addr(c.city),
            ice: c.ice, isCustomer: true, isSupplier: false, isCompany: true, isEnabled: true,
        });
        const id = res?.data?.id;
        if (id) { clientIds.push(id); ok(`Client société: ${c.name} (ICE: ${c.ice})`); }
        else warn(`Client "${c.name}" failed`);
    }
    ok(`${clientIds.length}/20 clients created`);

    // ── 6. Create 20 fournisseurs ───────────────────────────────────
    step('6/11 — Creating 20 Moroccan fournisseurs');
    const supplierIds = [];

    for (const s of SUPPLIERS_INDIVIDUAL) {
        const res = await api('POST', '/partners', {
            name: s.name, phoneNumber: s.phone, address: addr(s.city),
            isCustomer: false, isSupplier: true, isCompany: false, isEnabled: true,
        });
        const id = res?.data?.id;
        if (id) { supplierIds.push(id); ok(`Fournisseur: ${s.name}`); }
        else warn(`Fournisseur "${s.name}" failed`);
    }

    for (const s of SUPPLIERS_COMPANIES) {
        const res = await api('POST', '/partners', {
            name: s.name, phoneNumber: s.phone, address: addr(s.city),
            ice: s.ice, isCustomer: false, isSupplier: true, isCompany: true, isEnabled: true,
        });
        const id = res?.data?.id;
        if (id) { supplierIds.push(id); ok(`Fournisseur société: ${s.name} (ICE: ${s.ice})`); }
        else warn(`Fournisseur "${s.name}" failed`);
    }
    ok(`${supplierIds.length}/20 fournisseurs created`);

    // ── 7. Create 5 livreurs ────────────────────────────────────────
    step('7/11 — Creating 5 livreurs');
    const livreurIds = [];
    for (const l of LIVREURS) {
        const res = await api('POST', '/delivery', {
            name: l.name, phoneNumber: l.phoneNumber, email: l.email, password: l.password, isActive: true,
        });
        const id = res?.data?.id;
        if (id) { livreurIds.push(id); ok(`Livreur: ${l.name}`); }
        else warn(`Livreur "${l.name}" failed`);
    }
    ok(`${livreurIds.length}/5 livreurs created`);

    // ── 8. Stock movements for 60 random products ──────────────────
    step('8/11 — Adding stock for ~60 random products');
    const stockCount = Math.min(60, productIds.length);
    const stockedProducts = sample(productIds, stockCount);
    let stockOk = 0;

    for (const productId of stockedProducts) {
        const qty = rand(20, 200);
        const moveRes = await api('POST', '/inventory/movements', {
            movementType: 'receipt', productId, quantity: qty,
            destWarehouseId: warehouseId, notes: 'Stock initial — approvisionnement démo',
        });
        const movementId = moveRes?.data?.id;
        if (!movementId) { warn(`Stock movement create failed for product ${productId}`); continue; }

        const valRes = await api('POST', '/inventory/movements/validate', { movementId });
        if (valRes?.data || valRes?.code?.startsWith?.('INV') || valRes?.code?.startsWith?.('STK')) {
            stockOk++;
            process.stdout.write(`\r  📊  Stock validated: ${stockOk}/${stockCount}  `);
        } else {
            warn(`Stock validate failed for movement ${movementId}`);
        }
    }
    log(''); ok(`${stockOk}/${stockCount} stock movements validated`);

    // ── 9. Create 10 Devis ──────────────────────────────────────────
    step('9/11 — Creating 10 Devis (quotes)');
    const quoteIds = [];

    for (let i = 0; i < 10; i++) {
        const customerId = pick(clientIds);
        const chosen = sample(productMap, rand(2, 5));
        let subtotal = 0;
        const items = chosen.map(p => {
            const qty = rand(1, 10);
            const lineSub = qty * p.price;
            subtotal += lineSub;
            return { productId: p.id, quantity: qty, unitPrice: p.price, tax: 20, description: p.name, total: +(lineSub * 1.2).toFixed(2) };
        });
        const discount = rand(0, 1) ? rand(10, 100) : 0;
        const tax = +(subtotal * 0.2).toFixed(2);
        const total = +Math.max(subtotal + tax - discount, 0).toFixed(2);

        const res = await api('POST', '/quotes', {
            customerId, date: today(-rand(0, 30)), expirationDate: today(rand(15, 45)),
            discount, discountType: 0, subtotal: +subtotal.toFixed(2), tax, total,
            direction: 'VENTE', notes: 'Devis auto-généré — démo', items,
        });
        const id = res?.data?.id;
        if (id) { quoteIds.push(id); ok(`Devis #${id} — ${chosen.length} articles — ${fmtMAD(total)}`); }
        else warn(`Devis ${i + 1} failed`);
    }
    ok(`${quoteIds.length}/10 devis created`);

    // ── 10. Create 10 Bons de Livraison ────────────────────────────
    step('10/11 — Creating 10 Bons de Livraison (orders)');
    const orderIds = [];

    for (let i = 0; i < 10; i++) {
        const customerId = pick(clientIds);
        const chosen = sample(productMap, rand(1, 5));
        let subtotal = 0;
        const items = chosen.map(p => {
            const qty = rand(1, 8);
            subtotal += qty * p.price;
            return { productId: p.id, description: p.name, quantity: qty, unitPrice: p.price, tax: 20 };
        });
        const tax = +(subtotal * 0.2).toFixed(2);
        const total = +(subtotal + tax).toFixed(2);

        const res = await api('POST', '/orders', {
            customerId, date: today(-rand(0, 20)), dueDate: today(rand(5, 30)),
            subtotal: +subtotal.toFixed(2), tax, total,
            discount: 0, discountType: 0, notes: 'Bon de livraison démo', items,
        });
        const id = res?.data?.id;
        if (id) { orderIds.push(id); ok(`BL #${id} — ${chosen.length} articles — ${fmtMAD(total)}`); }
        else warn(`BL ${i + 1} failed`);
    }
    ok(`${orderIds.length}/10 bons de livraison created`);

    // ── 11. Create 10 Factures + payments ──────────────────────────
    step('11/11 — Creating 10 Factures + payments');
    const invoiceData = [];

    for (let i = 0; i < 10; i++) {
        const customerId = pick(clientIds);
        const chosen = sample(productMap, rand(1, 6));
        let subtotal = 0;
        const items = chosen.map(p => {
            const qty = rand(1, 10);
            subtotal += qty * p.price;
            return { productId: p.id, quantity: qty, unitPrice: p.price, tax: 20, description: p.name };
        });
        const tax = +(subtotal * 0.2).toFixed(2);
        const total = +(subtotal + tax).toFixed(2);

        const res = await api('POST', '/invoices', {
            customerId, date: today(-rand(0, 45)), dueDate: today(rand(15, 60)),
            subtotal: +subtotal.toFixed(2), tax, total,
            discount: 0, discountType: 0, direction: 'VENTE', notes: 'Facture démo', items,
        });
        const id = res?.data?.id;
        if (!id) { warn(`Facture ${i + 1} failed`); continue; }
        ok(`Facture #${id} — ${chosen.length} articles — ${fmtMAD(total)}`);

        // Validate invoice (DRAFT → UNPAID)
        await api('PUT', `/invoices/${id}/validate`);
        invoiceData.push({ id, total, customerId });
    }
    ok(`${invoiceData.length}/10 factures created & validated`);

    // ─── Payments ───────────────────────────────────────────────────
    log('\n  💳  Adding payments:');
    const PAY_TYPES = ['cash', 'check', 'bank_transfer', 'credit_card', 'mobile_payment'];
    let paidCount = 0, partialCount = 0, unpaidCount = 0;

    for (let i = 0; i < invoiceData.length; i++) {
        const { id: invoiceId, total, customerId } = invoiceData[i];

        if (i < 4) {
            // Full payment
            const pRes = await api('POST', '/payments', {
                invoiceId, customerId, amount: +total.toFixed(2),
                paymentDate: today(-rand(0, 5)), paymentType: pick(PAY_TYPES),
                notes: 'Paiement intégral — démo',
            });
            if (pRes?.data?.id) { paidCount++; ok(`💵  Facture #${invoiceId}: COMPLET — ${fmtMAD(total)}`); }
            else warn(`Payment for #${invoiceId} failed`);

        } else if (i < 7) {
            // Partial payment (~30-70%)
            const partial = +(total * randFloat(0.3, 0.7)).toFixed(2);
            const pRes = await api('POST', '/payments', {
                invoiceId, customerId, amount: partial,
                paymentDate: today(-rand(0, 10)), paymentType: pick(PAY_TYPES),
                notes: 'Paiement partiel — démo',
            });
            if (pRes?.data?.id) { partialCount++; ok(`💶  Facture #${invoiceId}: PARTIEL — ${fmtMAD(partial)} / ${fmtMAD(total)}`); }
            else warn(`Partial payment for #${invoiceId} failed`);

        } else {
            unpaidCount++;
            ok(`🔴  Facture #${invoiceId}: IMPAYÉ — ${fmtMAD(total)}`);
        }
    }

    // ─── Summary ────────────────────────────────────────────────────
    log(`\n${'═'.repeat(60)}`);
    log('🎉  SEED COMPLETED SUCCESSFULLY!\n');
    log(`  📂  Categories          : ${categoryIds.filter(Boolean).length}/${CATEGORIES.length}`);
    log(`  📦  Products            : ${productIds.length}/${PRODUCTS.length}`);
    log(`  👤  Clients             : ${clientIds.length}/20`);
    log(`  🏭  Fournisseurs        : ${supplierIds.length}/20`);
    log(`  🚚  Livreurs            : ${livreurIds.length}/5`);
    log(`  📊  Stock movements     : ${stockOk}/${stockCount}`);
    log(`  📋  Devis               : ${quoteIds.length}/10`);
    log(`  🚢  Bons de livraison   : ${orderIds.length}/10`);
    log(`  🧾  Factures            : ${invoiceData.length}/10`);
    log(`     ✅  Payées            : ${paidCount}`);
    log(`     🔀  Partiellement    : ${partialCount}`);
    log(`     🔴  Impayées         : ${unpaidCount}`);
    log(`${'═'.repeat(60)}\n`);
}

main().catch(err => { console.error('\n❌  Fatal:', err.message); process.exit(1); });
