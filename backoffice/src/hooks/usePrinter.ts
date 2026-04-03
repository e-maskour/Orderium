import { useState, useCallback, useEffect } from 'react';
import {
  printReceipt,
  detectPlatform,
  type PrinterConfig,
  type ReceiptData,
  type PrintResult,
} from '@shared-print/PrintManager';
import { printersService } from '../modules/printers';
import type { IPrinter } from '../modules/printers';

export function usePrinter() {
  const [config, setConfigState] = useState<PrinterConfig>({
    brand: 'browser',
    paperWidth: 80,
  });
  const [printers, setPrinters] = useState<IPrinter[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [lastResult, setLastResult] = useState<PrintResult | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  useEffect(() => {
    printersService
      .getPrinters()
      .then((data) => {
        setPrinters(data);
        const def = data.find((p) => p.isDefault) ?? data[0];
        if (def) {
          setConfigState({
            id: def.id,
            brand: def.brand as PrinterConfig['brand'],
            ip: def.ip ?? undefined,
            port: def.port,
            paperWidth: def.paperWidth,
          });
        }
      })
      .catch(() => {
        // Fail silently — browser fallback will be used
      });
  }, []);

  const print = useCallback(
    async (data: ReceiptData) => {
      setIsPrinting(true);
      setReceipt(data);

      await new Promise((r) => setTimeout(r, 80));

      try {
        const result = await printReceipt(config, data);
        setLastResult(result);

        // Log to API (fire and forget)
        printersService
          .logPrintJob({
            printerId: config.id,
            documentType: 'receipt',
            method: result.method,
            status: result.status,
            durationMs: result.durationMs,
          })
          .catch(() => {});

        if (config.id) {
          printersService.pingPrinter(config.id).catch(() => {});
        }

        return result;
      } finally {
        setIsPrinting(false);
        setTimeout(() => setReceipt(null), 3000);
      }
    },
    [config],
  );

  return {
    print,
    isPrinting,
    lastResult,
    config,
    setConfig: setConfigState,
    printers,
    receipt,
    platform: detectPlatform(),
  };
}
