/**
 * Platform detection for the printer settings screen.
 *
 * This file used to drive printing from the browser. It no longer can, and
 * nothing here should try again:
 *
 *   - A page served over https:// may never call a printer's plain http://
 *     LAN endpoint. The mixed-content rule blocks it with no override, which
 *     killed the Epson ePOS and Star WebPRNT transports.
 *   - Browsers cannot open raw sockets, so there is no way to reach a printer
 *     directly.
 *   - QZ Tray needs a paid signing certificate to print without a prompt and
 *     only helps the one machine it is installed on.
 *
 * Printing is done by the print agent, a small service running inside the
 * shop. See docs/superpowers/specs/2026-09-09-print-agent-design.md
 */

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
