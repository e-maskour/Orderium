import { Package, Phone, MapPin, X, Printer, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { formatAmount } from '@orderium/ui';
import { useState, useEffect } from 'react';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  onStatusChange?: (orderId: number, status: string) => void;
  onPrintReceipt?: () => void;
}

const STATUS_CONFIG: Record<string, { label_fr: string; label_ar: string; bg: string; color: string; border: string; dot: string; icon: string }> = {
  to_delivery: { label_fr: 'À livrer', label_ar: 'للتوصيل', bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b', icon: '🚚' },
  in_delivery: { label_fr: 'En livraison', label_ar: 'في التوصيل', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dot: '#06b6d4', icon: '🚴' },
  in_progress: { label_fr: 'En cours', label_ar: 'قيد التنفيذ', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6', icon: '⚙️' },
  pending: { label_fr: 'En attente', label_ar: 'في الانتظار', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8', icon: '⏳' },
  confirmed: { label_fr: 'Confirmé', label_ar: 'مؤكد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6', icon: '✅' },
  picked_up: { label_fr: 'Récupéré', label_ar: 'تم الاستلام', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6', icon: '📦' },
  delivered: { label_fr: 'Livré', label_ar: 'تم التوصيل', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981', icon: '✔️' },
  canceled: { label_fr: 'Annulé', label_ar: 'ملغى', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444', icon: '❌' },
  cancelled: { label_fr: 'Annulé', label_ar: 'ملغى', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444', icon: '❌' },
};

const NEXT_ACTIONS: Record<string, { value: string; label_fr: string; label_ar: string; bg: string; color: string; border: string }[]> = {
  pending: [
    { value: 'confirmed', label_fr: 'Confirmer', label_ar: 'تأكيد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
    { value: 'cancelled', label_fr: 'Annuler', label_ar: 'إلغاء', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  ],
  confirmed: [
    { value: 'picked_up', label_fr: 'Récupéré', label_ar: 'تم الاستلام', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
    { value: 'delivered', label_fr: 'Livré', label_ar: 'تم التسليم', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    { value: 'cancelled', label_fr: 'Annuler', label_ar: 'إلغاء', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  ],
  picked_up: [
    { value: 'delivered', label_fr: 'Marquer livré', label_ar: 'تم التسليم', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
    { value: 'cancelled', label_fr: 'Annuler', label_ar: 'إلغاء', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  ],
  in_progress: [
    { value: 'delivered', label_fr: 'Marquer livré', label_ar: 'تم التسليم', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  ],
};

export function OrderDetailsModal({ order, onClose, onStatusChange, onPrintReceipt }: OrderDetailsModalProps) {
  const { t, language } = useLanguage();
  const isAr = language?.startsWith('ar');

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const status = order.status || 'pending';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const statusLabel = isAr ? statusCfg.label_ar : statusCfg.label_fr;

  const items: any[] = order.items || [];
  const globalDiscount = parseFloat(order.discount || 0);
  const grandTotal = parseFloat(order.total || 0);

  const orderDate = new Date(order.date || order.dateCreated);
  const formattedDate = orderDate.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

  const nextActions = (onStatusChange && NEXT_ACTIONS[status]) || [];

  return (
    <Dialog
      visible
      onHide={onClose}
      modal
      dismissableMask
      showHeader={false}
      style={isMobile
        ? { width: '100vw', height: '100dvh', maxWidth: '100vw', maxHeight: '100dvh', margin: 0, borderRadius: 0, overflow: 'hidden' }
        : { width: '95vw', maxWidth: '1100px', height: '90vh', maxHeight: '90vh', margin: 0, borderRadius: '0.875rem', overflow: 'hidden' }
      }
      contentStyle={{ padding: 0, borderRadius: isMobile ? 0 : '0.875rem', overflow: 'hidden', height: isMobile ? '100dvh' : '90vh', display: 'flex', flexDirection: 'column' }}
      pt={{
        root: { style: { borderRadius: isMobile ? 0 : '0.875rem', width: isMobile ? '100vw' : '95vw', maxWidth: isMobile ? '100vw' : '1100px', height: isMobile ? '100dvh' : '90vh', maxHeight: isMobile ? '100dvh' : '90vh', ...(isMobile && { position: 'fixed', top: 0, left: 0, margin: 0, bottom: 0, right: 0 }) } },
        mask: { style: isMobile ? { alignItems: 'flex-start', padding: 0 } : {} },
      }}
    >
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #235ae4)', padding: '0.875rem 1rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
            <Package style={{ width: '1.125rem', height: '1.125rem', color: '#fff', flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>#{order.orderNumber}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{formattedDate}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`, padding: '0.25rem 0.625rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
              {statusCfg.icon} {statusLabel}
            </span>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ width: '1.875rem', height: '1.875rem', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X style={{ width: '0.9rem', height: '0.9rem', color: '#fff' }} />
            </button>
          </div>
        </div>

        {/* Customer row */}
        {(order.customerName || order.customerPhone) && (
          <div style={{ marginTop: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {order.customerName && <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerName}</p>}
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone style={{ width: '0.7rem', height: '0.7rem' }} />{order.customerPhone}
                </a>
              )}
            </div>
            {order.customerAddress && (
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'flex-start', gap: '0.2rem', maxWidth: '9rem', textAlign: 'right' }}>
                <MapPin style={{ width: '0.7rem', height: '0.7rem', flexShrink: 0, marginTop: '0.1rem' }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customerAddress}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ background: '#f8fafc', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', overflow: 'hidden' }}>

        {/* Note */}
        {order.note && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: '#92400e', display: 'flex', gap: '0.4rem' }}>
            <span>📝</span><span>{order.note}</span>
          </div>
        )}

        {/* Items */}
        <div style={{ background: '#fff', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', marginLeft: '-0.75rem', marginRight: '-0.75rem', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
          {/* Items header */}
          <div style={{ padding: '0.5rem 0.75rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('orderItems')}</span>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{items.length} article{items.length !== 1 ? 's' : ''}</span>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>Aucun article</div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {items.map((item: any, idx: number) => {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unitPrice || 0);
                const disc = parseFloat(item.discount || 0);
                const lineTotal = parseFloat(item.total || 0);
                const name = item.description || item.product?.name || `#${item.productId}`;
                return (
                  <div key={idx} style={{ padding: '0.625rem 0.75rem', borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'center', gap: '0.625rem', direction: isAr ? 'rtl' : 'ltr' }}>
                    {/* qty */}
                    <div style={{ minWidth: '1.875rem', height: '1.875rem', background: '#fef3c7', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>{Number.isInteger(qty) ? qty : qty.toFixed(1)}</span>
                    </div>
                    {/* name */}
                    <div style={{ flex: 1, minWidth: 0, textAlign: isAr ? 'right' : 'left' }}>
                      <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: isAr ? 'rtl' : 'ltr' }}>{name}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                        {formatAmount(unitPrice, 2)} × {Number.isInteger(qty) ? qty : qty.toFixed(2)}
                        {disc > 0 && <span style={{ color: '#dc2626' }}> − {formatAmount(disc, 2)}</span>}
                      </p>
                    </div>
                    {/* total */}
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{formatAmount(lineTotal, 2)} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{t('currency')}</span></span>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Totals (fixed) ── */}
      <div style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', padding: '1rem 0.75rem', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {globalDiscount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#dc2626' }}>
            <span>{t('discount')}</span>
            <span>− {formatAmount(globalDiscount, 2)} {t('currency')}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#1d4ed8,#235ae4)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff' }}>{t('grandTotal')}</span>
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{formatAmount(grandTotal, 2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('currency')}</span></span>
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '0.75rem', flexShrink: 0 }}>
        {nextActions.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {nextActions.map(action => (
              <button
                key={action.value}
                type="button"
                onClick={() => onStatusChange!(order.id, action.value)}
                style={{ flex: 1, minWidth: '5rem', padding: '0.4rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', backgroundColor: action.bg, color: action.color, border: `1.5px solid ${action.border}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
              >
                <ChevronRight style={{ width: '0.75rem', height: '0.75rem' }} />
                {isAr ? action.label_ar : action.label_fr}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          {onPrintReceipt && (
            <Button
              label={isAr ? 'طباعة' : 'Imprimer'}
              onClick={onPrintReceipt}
              icon={<Printer style={{ width: '0.8rem', height: '0.8rem', marginInlineEnd: '0.25rem' }} />}
              style={{ flex: 1, height: '2.5rem', fontWeight: 600, background: '#f1f5f9', border: 'none', color: '#334155', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
            />
          )}
          <Button
            label={t('close')}
            onClick={onClose}
            style={{ flex: 1, height: '2.5rem', fontWeight: 600, background: '#f1f5f9', border: 'none', color: '#334155', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
          />
        </div>
      </div>
    </Dialog>
  );
}


