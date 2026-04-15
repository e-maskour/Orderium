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
    brand: 'epson' | 'star' | 'qztray' | 'browser';
    ip?: string;
    port?: number;
    name?: string;
    paperWidth?: 58 | 80 | 210;
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
                    const W = config.paperWidth === 58 ? 32 : 48;
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
    const W = config.paperWidth === 58 ? 32 : 48;
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

    const W = config.paperWidth === 58 ? 32 : 48;
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

    if (config.brand === 'qztray')
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
