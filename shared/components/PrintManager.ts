/**
 * PrintManager.ts — runs in the browser only
 * Auto-fallback chain:
 *   1. Epson ePOS  (silent WiFi — Epson TM series)
 *   2. Star WebPRNT (silent WiFi — Star Micronics)
 *   3. QZ Tray     (silent USB/Network — Windows/Mac)
 *   4. window.print() (OS dialog — iOS AirPrint, Android Mopria, any browser)
 */

export interface PrinterConfig {
    id?: string;
    brand: 'epson' | 'star' | 'generic' | 'qztray' | 'browser';
    ip?: string;
    port?: number;
    name?: string;
    paperWidth?: 80 | 148;
}

export interface ReceiptLine {
    name: string;
    qty: number;
    unitPrice: number;
    total: number;
}

export interface ReceiptData {
    storeName: string;
    storePhone?: string;
    orderNumber: string;
    date: string;
    clientName: string;
    clientPhone?: string;
    items: ReceiptLine[];
    subtotal: number;
    discount?: number;
    total: number;
    footer?: string;
}

export interface PrintResult {
    method: string;
    status: 'success' | 'failed' | 'fallback';
    durationMs: number;
    error?: string;
}

// ── ESC/POS builder ───────────────────────────────────────
export function buildEscPos(data: ReceiptData, charWidth = 48): string[] {
    const W = charWidth;
    const row = (l: string, r: string) =>
        l.padEnd(W - r.length) + r + '\n';

    return [
        '\x1B\x40',           // init
        '\x1B\x61\x01',       // center
        '\x1B\x21\x30',       // double size
        data.storeName + '\n',
        '\x1B\x21\x00',       // normal
        ...(data.storePhone ? [data.storePhone + '\n'] : []),
        '='.repeat(W) + '\n',
        '\x1B\x61\x00',       // left
        `Commande : ${data.orderNumber}\n`,
        `Date     : ${data.date}\n`,
        `Client   : ${data.clientName}\n`,
        ...(data.clientPhone ? [`Tél      : ${data.clientPhone}\n`] : []),
        '-'.repeat(W) + '\n',
        ...data.items.flatMap(item => [
            item.name + '\n',
            row(`  ${item.qty} x ${item.unitPrice.toFixed(2)} DH`, `${item.total.toFixed(2)} DH`),
        ]),
        '='.repeat(W) + '\n',
        '\x1B\x61\x02',       // right
        '\x1B\x45\x01',       // bold
        row('TOTAL :', `${data.total.toFixed(2)} DH`),
        '\x1B\x45\x00',       // bold off
        '\x1B\x61\x01',       // center
        '\n' + (data.footer ?? 'Merci pour votre confiance !') + '\n',
        '\x1B\x64\x04',       // feed 4 lines
        '\x1D\x56\x41\x00',   // cut
    ];
}

// ── Print strategies ──────────────────────────────────────
async function viaEpsonEpos(config: PrinterConfig, data: ReceiptData): Promise<void> {
    if (typeof (window as any).epson === 'undefined')
        throw new Error('Epson SDK non chargé');

    const { epson } = window as any;

    return new Promise((resolve, reject) => {
        const device = new epson.ePOSDevice();
        device.connect(config.ip, config.port ?? 8008, (res: string) => {
            if (res !== 'OK' && res !== 'SSL_CONNECT_OK')
                return reject(new Error(`Connexion Epson impossible (${res})`));

            device.createDevice('local_printer', device.DEVICE_TYPE_PRINTER,
                { crypto: false, buffer: false },
                (printer: any, code: string) => {
                    if (code !== 'OK') return reject(new Error(`Epson erreur (${code})`));
                    const W = config.paperWidth === 148 ? 64 : 48;
                    const cmds = buildEscPos(data, W);
                    const encoder = new TextEncoder();
                    cmds.forEach(cmd => printer.addRaw(encoder.encode(cmd)));
                    printer.addCut(printer.CUT_FEED);
                    printer.send();
                    printer.onreceive = (r: any) => {
                        device.deleteDevice(printer, () => device.disconnect());
                        r.success ? resolve() : reject(new Error('Epson: échec envoi'));
                    };
                });
        });
    });
}

async function viaStarWebPRNT(config: PrinterConfig, data: ReceiptData): Promise<void> {
    if (typeof (window as any).StarWebPRNT === 'undefined')
        throw new Error('Star SDK non chargé');

    const { StarWebPRNT } = window as any;
    const W = config.paperWidth === 148 ? 64 : 48;
    const b = new StarWebPRNT.StarWebPRNTBuilder();

    let req = b.createInitializationElement();
    req += b.createAlignmentElement({ position: 'Center' });
    req += b.createTextElement({ emphasis: true, data: data.storeName + '\n' });
    req += b.createAlignmentElement({ position: 'Left' });
    req += b.createTextElement({ data: '='.repeat(W) + '\n' });
    req += b.createTextElement({ data: `Commande : ${data.orderNumber}\n` });
    req += b.createTextElement({ data: `Client   : ${data.clientName}\n` });
    req += b.createTextElement({ data: '-'.repeat(W) + '\n' });

    for (const item of data.items) {
        req += b.createTextElement({ data: item.name + '\n' });
        const right = `${item.total.toFixed(2)} DH`;
        const left = `  ${item.qty} x ${item.unitPrice.toFixed(2)} DH`;
        req += b.createTextElement({ data: left.padEnd(W - right.length) + right + '\n' });
    }

    req += b.createTextElement({ data: '='.repeat(W) + '\n' });
    req += b.createAlignmentElement({ position: 'Right' });
    req += b.createTextElement({ emphasis: true, data: `TOTAL : ${data.total.toFixed(2)} DH\n` });
    req += b.createCutPaperElement({ feed: true });

    const trader = new StarWebPRNT.StarWebPRNTTrader(`http://${config.ip}/StarWebPRNT/SendMessage`);
    await trader.sendMessage(new StarWebPRNT.StarWebPRNTTraderParameters({ request: req }));
}

async function viaQzTray(config: PrinterConfig, data: ReceiptData): Promise<void> {
    const qz = (window as any).qz;
    if (!qz) throw new Error('QZ Tray non disponible');
    if (!qz.websocket.isActive()) await qz.websocket.connect();

    const W = config.paperWidth === 148 ? 64 : 48;
    const name = config.name ?? (await qz.printers.getDefault());
    const cfg = qz.configs.create(name);
    const cmds = buildEscPos(data, W).map(d => ({ type: 'raw', format: 'plain', data: d }));
    await qz.print(cfg, cmds);
}

// ── Main entry point ──────────────────────────────────────
export async function printReceipt(
    config: PrinterConfig,
    data: ReceiptData,
): Promise<PrintResult> {
    const started = Date.now();

    const strategies: Array<{ name: string; fn: () => Promise<void> }> = [];

    if (config.brand === 'epson' && config.ip)
        strategies.push({ name: 'epson-epos', fn: () => viaEpsonEpos(config, data) });

    if (config.brand === 'star' && config.ip)
        strategies.push({ name: 'star-webprnt', fn: () => viaStarWebPRNT(config, data) });

    if (config.brand === 'qztray' || config.brand === 'generic')
        strategies.push({ name: 'qztray', fn: () => viaQzTray(config, data) });

    // Always add browser as final fallback
    strategies.push({ name: 'browser', fn: async () => { window.print(); } });

    for (let i = 0; i < strategies.length; i++) {
        const { name, fn } = strategies[i];
        try {
            await fn();
            return {
                method: name,
                status: i === 0 ? 'success' : 'fallback',
                durationMs: Date.now() - started,
            };
        } catch (err: any) {
            if (i === strategies.length - 1) {
                window.print();
                return { method: 'browser', status: 'fallback', durationMs: Date.now() - started };
            }
            console.warn(`[PrintManager] ${name} failed, trying next…`, err);
        }
    }

    return { method: 'none', status: 'failed', durationMs: Date.now() - started };
}

// ── Network discovery ─────────────────────────────────────
export interface DiscoveredPrinter {
    /** Display name */
    name: string;
    /** Detected brand */
    brand: PrinterConfig['brand'];
    /** Connection type inferred from discovery method */
    connectionType: 'wifi' | 'usb' | 'network';
    /** IP address (wifi/network printers) */
    ip?: string;
    /** Port the printer was found on */
    port?: number;
    /** How this printer was found */
    discoveryMethod: 'qztray' | 'webusb' | 'http-probe';
    /** Raw metadata */
    meta?: Record<string, string | number>;
}

/**
 * Probe a single IP+port with a short timeout.
 * Returns true if the server responded (HTTP 2xx/4xx — anything that isn't a network error).
 */
async function probeHttp(ip: string, port: number, path: string, timeoutMs = 1500): Promise<boolean> {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    try {
        await fetch(`http://${ip}:${port}${path}`, {
            method: 'GET',
            signal: controller.signal,
            mode: 'no-cors', // avoids CORS rejection — we just need to know it's alive
        });
        return true; // 'no-cors' opaque response = server responded
    } catch {
        return false;
    } finally {
        clearTimeout(tid);
    }
}

/**
 * Discover printers on the local network.
 *
 * Three strategies run in parallel:
 *   1. QZ Tray   — lists all system printers (USB, network, etc.) if installed
 *   2. WebUSB    — enumerate already-permitted USB devices (no dialog)
 *   3. HTTP probe — try to reach Epson ePOS (port 8008) and Star WebPRNT (port 80)
 *                   on the provided `subnet` (e.g. "192.168.1") for hosts .1–.254
 *
 * @param subnet  e.g. "192.168.1"  — only used for HTTP probing
 * @param onProgress  called with each newly discovered printer in real-time
 */
export async function discoverPrinters(
    subnet = '',
    onProgress?: (printer: DiscoveredPrinter) => void,
): Promise<DiscoveredPrinter[]> {
    const results: DiscoveredPrinter[] = [];

    const emit = (p: DiscoveredPrinter) => {
        results.push(p);
        onProgress?.(p);
    };

    // ── 1. QZ Tray ──
    try {
        const qz = (window as any).qz;
        if (qz) {
            if (!qz.websocket.isActive()) await qz.websocket.connect();
            const names: string[] = await qz.printers.find();
            for (const name of names) {
                emit({
                    name,
                    brand: 'qztray',
                    connectionType: 'usb',
                    discoveryMethod: 'qztray',
                });
            }
        }
    } catch {
        // QZ Tray not available — continue
    }

    // ── 2. WebUSB (already-permitted devices, no dialog) ──
    try {
        if (typeof navigator !== 'undefined' && 'usb' in navigator) {
            const devices = await (navigator as any).usb.getDevices();
            for (const dev of devices) {
                emit({
                    name: dev.productName || `USB ${dev.vendorId}:${dev.productId}`,
                    brand: 'generic',
                    connectionType: 'usb',
                    discoveryMethod: 'webusb',
                    meta: { vendorId: dev.vendorId, productId: dev.productId },
                });
            }
        }
    } catch {
        // WebUSB not available
    }

    // ── 3. HTTP probe on subnet ──
    if (subnet) {
        // Probe Epson ePOS (8008) and Star WebPRNT (80) in parallel batches
        const EPSON_PATH = '/cgi-bin/epos/service';
        const STAR_PATH = '/StarWebPRNT/GetStatus';
        const BATCH = 20; // concurrent probes

        const hosts = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);

        for (let i = 0; i < hosts.length; i += BATCH) {
            const batch = hosts.slice(i, i + BATCH);
            await Promise.all(
                batch.map(async (ip) => {
                    const [epsonOk, starOk] = await Promise.all([
                        probeHttp(ip, 8008, EPSON_PATH),
                        probeHttp(ip, 80, STAR_PATH),
                    ]);
                    if (epsonOk) {
                        emit({
                            name: `Epson @ ${ip}`,
                            brand: 'epson',
                            connectionType: 'wifi',
                            ip,
                            port: 8008,
                            discoveryMethod: 'http-probe',
                        });
                    }
                    if (starOk) {
                        emit({
                            name: `Star @ ${ip}`,
                            brand: 'star',
                            connectionType: 'wifi',
                            ip,
                            port: 80,
                            discoveryMethod: 'http-probe',
                        });
                    }
                }),
            );
        }
    }

    return results;
}

// ── Platform detection ────────────────────────────────────
export function detectPlatform() {
    const ua = navigator.userAgent;
    return {
        os: /iPad|iPhone|iPod/.test(ua) ? 'ios'
            : /Android/.test(ua) ? 'android'
                : /Windows/.test(ua) ? 'windows'
                    : /Macintosh/.test(ua) ? 'mac'
                        : 'other',
        isMobile: /Android|iPhone|iPad/.test(ua),
        hasQzTray: typeof (window as any).qz !== 'undefined',
    };
}
