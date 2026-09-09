/**
 * PrintManager.ts — runs in the browser only
 *
 * The browser sandbox cannot reach a printer directly:
 *   - Epson ePOS and Star WebPRNT expose plain http:// endpoints on the LAN,
 *     which a page served over https:// may never call (mixed-content rule).
 *   - QZ Tray requires a paid signing certificate to print without a prompt,
 *     and only helps the one machine it is installed on.
 *
 * So the only transport that works from a browser is the OS print dialog.
 * Silent printing is handled server-side by the print agent; see
 * docs/superpowers/specs/2026-09-09-print-agent-design.md
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

// ── Print ─────────────────────────────────────────────────
/**
 * Opens the OS print dialog. The caller must have rendered <PrintableReceipt />
 * so the dialog has an 80mm receipt to print.
 */
export async function printReceipt(
    _config: PrinterConfig,
    _data: ReceiptData,
): Promise<PrintResult> {
    const started = Date.now();
    window.print();
    return {
        method: 'browser',
        status: 'success',
        durationMs: Date.now() - started,
    };
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
    };
}
