import { useState, useEffect, useCallback } from 'react';
import {
  printReceipt,
  type PrinterConfig,
  type ReceiptData,
  type PrintResult,
} from '@shared-print/PrintManager';
import { API_ROUTES } from '../common/api-routes';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface Printer {
  id: string;
  name: string;
  brand: string;
  connectionType: string;
  model?: string;
  ip?: string;
  port: number;
  paperWidth: number;
  isDefault: boolean;
  documentTypes: string[];
  lastSeenAt?: string;
  isEnabled: boolean;
}

export function usePrinter() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_ROUTES.PRINTERS.LIST, { headers: getAuthHeaders() })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((json) => setPrinters(json.data ?? []))
      .catch(() => setPrinters([]))
      .finally(() => setLoading(false));
  }, []);

  const defaultPrinter = printers.find((p) => p.isDefault) ?? printers[0];

  const print = useCallback(
    async (data: ReceiptData, printerId?: string): Promise<PrintResult> => {
      const printer = printerId
        ? (printers.find((p) => p.id === printerId) ?? defaultPrinter)
        : defaultPrinter;

      const config: PrinterConfig = {
        id: printer?.id ?? 'browser',
        brand: (printer?.brand as PrinterConfig['brand']) ?? 'browser',
        ip: printer?.ip,
        port: printer?.port ?? 8008,
        paperWidth: (printer?.paperWidth ?? 80) as PrinterConfig['paperWidth'],
        name: printer?.name,
      };

      const result = await printReceipt(config, data);

      // Log print job
      fetch(API_ROUTES.PRINTERS.PRINT_JOBS, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          printerId: printer?.id,
          documentType: 'receipt',
          method: result.method,
          status: result.status,
          durationMs: result.durationMs,
        }),
      }).catch(() => {});

      return result;
    },
    [printers, defaultPrinter],
  );

  return { printers, defaultPrinter, loading, print };
}
