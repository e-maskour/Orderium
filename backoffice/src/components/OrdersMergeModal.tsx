import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { ProgressSpinner } from 'primereact/progressspinner';
import { TabView, TabPanel } from 'primereact/tabview';
import { AlertTriangle, Layers, Printer } from 'lucide-react';
import { formatAmount } from '@orderium/ui';
import { useLanguage } from '../context/LanguageContext';
import type { TranslationKey } from '../lib/i18n';
import { ordersService } from '../modules/orders';
import type { IMergeConsolidatedLine, IMergeSummaryOrder } from '../modules/orders';

/** Which tab the recap is showing — also drives which PDF gets printed. */
export type OrdersMergeView = 'consolidated' | 'detailed';

interface OrdersMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderIds: number[];
  /** Fired when the user asks to print; receives the recap title and active tab. */
  onPrint: (title: string, view: OrdersMergeView) => void;
}

const CELL_BORDER = '1px solid #f1f5f9';

interface OrderBlockProps {
  order: IMergeSummaryOrder;
  t: (key: TranslationKey) => string;
  currency: string;
}

function OrderBlock({ order, t, currency }: OrderBlockProps) {
  return (
    <section
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '0.625rem',
        overflow: 'hidden',
        marginBottom: '0.875rem',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0.75rem',
          flexWrap: 'wrap',
          padding: '0.625rem 0.875rem',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#1d4ed8' }}>
          {order.orderNumber}
        </span>
        <span style={{ flex: 1, minWidth: '8rem', color: '#475569', fontSize: '0.8125rem' }}>
          {order.partnerName}
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
          {formatAmount(order.total, 2)} {currency}
        </span>
      </header>

      {order.items.length === 0 ? (
        <p
          style={{
            margin: 0,
            padding: '0.75rem 0.875rem',
            fontSize: '0.8125rem',
            color: '#94a3b8',
            fontStyle: 'italic',
          }}
        >
          {t('mergeNoItems')}
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
          <thead>
            <tr style={{ color: '#64748b', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'start', padding: '0.375rem 0.875rem', fontWeight: 600 }}>
                {t('mergeDesignation')}
              </th>
              <th
                style={{
                  textAlign: 'end',
                  padding: '0.375rem 0.5rem',
                  fontWeight: 600,
                  width: '5rem',
                }}
              >
                {t('quantity')}
              </th>
              <th
                style={{
                  textAlign: 'end',
                  padding: '0.375rem 0.5rem',
                  fontWeight: 600,
                  width: '7rem',
                }}
              >
                {t('unitPrice')}
              </th>
              <th
                style={{
                  textAlign: 'end',
                  padding: '0.375rem 0.875rem',
                  fontWeight: 600,
                  width: '7rem',
                }}
              >
                {t('total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${order.id}-${index}`} style={{ borderTop: CELL_BORDER }}>
                <td
                  style={{
                    padding: '0.375rem 0.875rem',
                    color: '#0f172a',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {item.description}
                </td>
                <td style={{ padding: '0.375rem 0.5rem', textAlign: 'end', color: '#475569' }}>
                  {formatAmount(item.quantity, Number.isInteger(item.quantity) ? 0 : 2)}
                </td>
                <td style={{ padding: '0.375rem 0.5rem', textAlign: 'end', color: '#475569' }}>
                  {formatAmount(item.unitPrice, 2)}
                </td>
                <td
                  style={{
                    padding: '0.375rem 0.875rem',
                    textAlign: 'end',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}
                >
                  {formatAmount(item.total, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

interface ConsolidatedTableProps {
  lines: IMergeConsolidatedLine[];
  t: (key: TranslationKey) => string;
}

/**
 * Picking list: one row per product with the quantity summed across every
 * selected order, so a single pass through the stock covers all of them.
 */
function ConsolidatedTable({ lines, t }: ConsolidatedTableProps) {
  if (lines.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          padding: '2rem 0',
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: '#94a3b8',
          fontStyle: 'italic',
        }}
      >
        {t('mergeNoItems')}
      </p>
    );
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
      <thead>
        <tr style={{ color: '#64748b', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
          <th style={{ textAlign: 'start', padding: '0.5rem 0.875rem', fontWeight: 600 }}>
            {t('mergeDesignation')}
          </th>
          <th
            style={{
              textAlign: 'end',
              padding: '0.5rem 0.75rem',
              fontWeight: 600,
              width: '7rem',
            }}
          >
            {t('mergeTotalQty')}
          </th>
          <th
            style={{
              textAlign: 'end',
              padding: '0.5rem 0.875rem',
              fontWeight: 600,
              width: '7rem',
            }}
          >
            {t('mergeOrdersCount')}
          </th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${line.productId ?? 'free'}-${index}`} style={{ borderTop: CELL_BORDER }}>
            <td
              style={{
                padding: '0.5rem 0.875rem',
                color: '#0f172a',
                overflowWrap: 'anywhere',
              }}
            >
              {line.description}
            </td>
            <td
              style={{
                padding: '0.5rem 0.75rem',
                textAlign: 'end',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {formatAmount(line.quantity, Number.isInteger(line.quantity) ? 0 : 2)}
            </td>
            <td style={{ padding: '0.5rem 0.875rem', textAlign: 'end', color: '#475569' }}>
              {line.orderCount}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Read-only consolidated recap of the selected orders, in two tabs: the
 * picking list (products totalled across orders) and the per-order detail.
 * Nothing is created or modified — the only action is printing the active tab
 * as a PDF.
 */
export function OrdersMergeModal({ isOpen, onClose, orderIds, onPrint }: OrdersMergeModalProps) {
  const { t, language } = useLanguage();
  const currency = language === 'ar' ? 'د.م' : 'DH';
  // Tab 0 is the picking list — the reason most users open this modal.
  const [activeIndex, setActiveIndex] = useState(0);
  const view: OrdersMergeView = activeIndex === 0 ? 'consolidated' : 'detailed';

  // Sorted key so re-selecting the same orders in another order hits the cache.
  const queryKey = ['orders', 'merge-summary', [...orderIds].sort((a, b) => a - b)];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => ordersService.getMergeSummary(orderIds),
    enabled: isOpen && orderIds.length >= 2,
    staleTime: 30_000,
  });

  const title = t('mergeOrdersTitle');

  return (
    <Dialog
      visible={isOpen}
      onHide={onClose}
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: '0.5rem',
              background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers style={{ width: '1rem', height: '1rem', color: '#fff' }} />
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.2,
              }}
            >
              {title}
            </p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
              {orderIds.length} {t('ordersSelected')}
            </p>
          </div>
        </div>
      }
      style={{ width: '54rem', maxWidth: '96vw' }}
      contentStyle={{ padding: '1rem 1.25rem', maxHeight: '70vh' }}
      modal
      draggable={false}
      resizable={false}
      pt={{
        header: { style: { padding: '1rem 1.25rem 0.75rem', borderBottom: '1px solid #f1f5f9' } },
      }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Button label={t('cancel')} outlined onClick={onClose} />
          <Button
            label={t('mergePrintPdf')}
            icon={
              <Printer style={{ width: '1rem', height: '1rem', marginInlineEnd: '0.375rem' }} />
            }
            onClick={() => onPrint(title, view)}
            disabled={!data || data.orders.length === 0}
          />
        </div>
      }
    >
      {isLoading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <ProgressSpinner style={{ width: '2.5rem', height: '2.5rem' }} />
        </div>
      )}

      {isError && (
        <p style={{ padding: '2rem 0', textAlign: 'center', color: '#dc2626' }}>
          {t('mergeLoadError')}
        </p>
      )}

      {data && (
        <>
          {data.missingIds.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                marginBottom: '0.875rem',
                borderRadius: '0.5rem',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                color: '#92400e',
                fontSize: '0.8125rem',
              }}
            >
              <AlertTriangle style={{ width: '1rem', height: '1rem', flexShrink: 0 }} />
              <span>
                {data.missingIds.length} {t('mergeMissingOrders')}
              </span>
            </div>
          )}

          <TabView
            activeIndex={activeIndex}
            onTabChange={(e) => setActiveIndex(e.index)}
            pt={{
              panelContainer: { style: { padding: '0.875rem 0 0' } },
            }}
          >
            <TabPanel header={t('mergeTabConsolidated')}>
              <ConsolidatedTable lines={data.consolidated ?? []} t={t} />
            </TabPanel>
            <TabPanel header={t('mergeTabDetails')}>
              {data.orders.map((order) => (
                <OrderBlock key={order.id} order={order} t={t} currency={currency} />
              ))}
            </TabPanel>
          </TabView>

          <div
            style={{ borderTop: '2px solid #2563eb', paddingTop: '0.75rem', marginTop: '0.25rem' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                color: '#475569',
                padding: '0.125rem 0',
              }}
            >
              <span>{t('mergeOrderCount')}</span>
              <span>{data.orderCount}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.8125rem',
                color: '#475569',
                padding: '0.125rem 0',
              }}
            >
              <span>{t('mergeTotalQuantity')}</span>
              <span>
                {formatAmount(data.totalQuantity, Number.isInteger(data.totalQuantity) ? 0 : 2)}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1rem',
                fontWeight: 700,
                color: '#0f172a',
                paddingTop: '0.5rem',
                marginTop: '0.375rem',
                borderTop: CELL_BORDER,
              }}
            >
              <span>{t('mergeGrandTotal')}</span>
              <span>
                {formatAmount(data.grandTotal, 2)} {currency}
              </span>
            </div>
          </div>
        </>
      )}
    </Dialog>
  );
}
