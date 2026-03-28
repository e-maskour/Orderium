import { Package, Phone, MapPin, X, Hash, Tag, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { formatAmount } from '@orderium/ui';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label_fr: string; label_ar: string; bg: string; color: string; border: string; dot: string }> = {
  to_delivery: { label_fr: 'À livrer', label_ar: 'للتوصيل', bg: '#fffbeb', color: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  in_delivery: { label_fr: 'En livraison', label_ar: 'في التوصيل', bg: '#ecfeff', color: '#0e7490', border: '#a5f3fc', dot: '#06b6d4' },
  in_progress: { label_fr: 'En cours', label_ar: 'قيد التنفيذ', bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe', dot: '#3b82f6' },
  pending: { label_fr: 'En attente', label_ar: 'في الانتظار', bg: '#f8fafc', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' },
  confirmed: { label_fr: 'Confirmé', label_ar: 'مؤكد', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  picked_up: { label_fr: 'Récupéré', label_ar: 'تم الاستلام', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', dot: '#8b5cf6' },
  delivered: { label_fr: 'Livré', label_ar: 'تم التوصيل', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981' },
  canceled: { label_fr: 'Annulé', label_ar: 'ملغى', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
  cancelled: { label_fr: 'Annulé', label_ar: 'ملغى', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', dot: '#ef4444' },
};

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const { t, language } = useLanguage();
  const isAr = language?.startsWith('ar');

  const status = order.status || 'pending';
  const statusCfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const statusLabel = isAr ? statusCfg.label_ar : statusCfg.label_fr;

  const items: any[] = order.items || [];
  const subtotal = items.reduce((s: number, i: any) => s + parseFloat(i.total || 0), 0);
  const globalDiscount = parseFloat(order.discount || 0);
  const grandTotal = parseFloat(order.total || 0);

  const orderDate = new Date(order.date || order.dateCreated);
  const formattedDate = orderDate.toLocaleDateString(isAr ? 'ar-MA' : 'fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const formattedTime = orderDate.toLocaleTimeString(isAr ? 'ar-MA' : 'fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Dialog
      visible
      onHide={onClose}
      modal
      dismissableMask
      showHeader={false}
      style={{ width: '100%', maxWidth: '540px', margin: 0, borderRadius: '1rem', overflow: 'hidden' }}
      breakpoints={{ '640px': '100vw' }}
      contentStyle={{ padding: 0, borderRadius: '1rem', overflow: 'hidden' }}
      pt={{ root: { style: { borderRadius: '1rem' } } }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8, #235ae4)',
        padding: '1.25rem 1.25rem 1rem',
      }}>
        {/* top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '2.5rem', height: '2.5rem',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '0.625rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Package style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {t('orderDetails')}
              </p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                #{order.orderNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '2rem', height: '2rem', borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
            aria-label="Fermer"
          >
            <X style={{ width: '1rem', height: '1rem', color: '#fff' }} />
          </button>
        </div>

        {/* status + date row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            background: statusCfg.bg, color: statusCfg.color,
            border: `1px solid ${statusCfg.border}`,
            padding: '0.3125rem 0.75rem', borderRadius: '9999px',
            fontSize: '0.8125rem', fontWeight: 700,
          }}>
            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: statusCfg.dot, flexShrink: 0 }} />
            {statusLabel}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            {formattedDate} · {formattedTime}
          </span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div style={{
        background: '#f8fafc',
        overflowY: 'auto',
        maxHeight: 'calc(90vh - 180px)',
        display: 'flex', flexDirection: 'column', gap: '0.75rem',
        padding: '1rem',
      }}>

        {/* Customer card */}
        <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* section header */}
          <div style={{ padding: '0.625rem 1rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User style={{ width: '0.875rem', height: '0.875rem', color: '#235ae4' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('customerInformation')}
            </span>
          </div>
          <div style={{ padding: '0.875rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {order.customerName && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: 'linear-gradient(135deg, #235ae4, #1a47b8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <User style={{ width: '0.875rem', height: '0.875rem', color: '#fff' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{t('customer')}</p>
                  <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{order.customerName}</p>
                </div>
              </div>
            )}
            {order.customerPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone style={{ width: '0.875rem', height: '0.875rem', color: '#16a34a' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{t('phone')}</p>
                  <a href={`tel:${order.customerPhone}`} style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#16a34a', textDecoration: 'none', display: 'block' }}>
                    {order.customerPhone}
                  </a>
                </div>
              </div>
            )}
            {order.customerAddress && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin style={{ width: '0.875rem', height: '0.875rem', color: '#2563eb' }} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{t('address')}</p>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{order.customerAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Note */}
        {order.note && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '0.75rem', padding: '0.75rem 1rem', display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>📝</span>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e', fontWeight: 500 }}>{order.note}</p>
          </div>
        )}

        {/* Items list */}
        <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* section header */}
          <div style={{ padding: '0.625rem 1rem', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Hash style={{ width: '0.875rem', height: '0.875rem', color: '#235ae4' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('orderItems')}
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
              {items.length} {items.length === 1 ? t('piece') || 'article' : t('pieces') || 'articles'}
            </span>
          </div>

          {items.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              <Package style={{ width: '2.5rem', height: '2.5rem', color: '#cbd5e1', margin: '0 auto 0.5rem', display: 'block' }} />
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{t('noItems') || 'Aucun article'}</p>
            </div>
          ) : (
            <div>
              {items.map((item: any, idx: number) => {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unitPrice || 0);
                const disc = parseFloat(item.discount || 0);
                const lineTotal = parseFloat(item.total || 0);
                const name = item.description || item.product?.name || `#${item.productId}`;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '0.875rem 1rem',
                      borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                    }}
                  >
                    {/* qty badge */}
                    <div style={{
                      minWidth: '2.25rem', height: '2.25rem',
                      background: '#fef3c7', borderRadius: '0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#b45309' }}>
                        {Number.isInteger(qty) ? qty : qty.toFixed(1)}
                      </span>
                    </div>

                    {/* name + price detail */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                        {formatAmount(unitPrice, 2)} × {Number.isInteger(qty) ? qty : qty.toFixed(2)}
                        {disc > 0 && (
                          <span style={{ color: '#dc2626', marginLeft: '0.375rem' }}>
                            − {formatAmount(disc, 2)} {t('currency')}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* line total */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>
                        {formatAmount(lineTotal, 2)}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.6875rem', color: '#94a3b8', fontWeight: 500 }}>{t('currency')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Totals footer */}
          <div style={{ borderTop: '2px solid #e2e8f0', background: '#f8fafc', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>{t('subtotal')}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                {formatAmount(subtotal, 2)} <span style={{ fontSize: '0.75rem' }}>{t('currency')}</span>
              </span>
            </div>
            {globalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8125rem', color: '#dc2626', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Tag style={{ width: '0.75rem', height: '0.75rem' }} />
                  {t('discount')}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#dc2626' }}>
                  − {formatAmount(globalDiscount, 2)} <span style={{ fontSize: '0.75rem' }}>{t('currency')}</span>
                </span>
              </div>
            )}
            {/* Grand total highlighted row */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'linear-gradient(135deg, #1d4ed8, #235ae4)',
              borderRadius: '0.625rem',
              padding: '0.75rem 1rem',
              marginTop: '0.25rem',
            }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff' }}>{t('grandTotal')}</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                {formatAmount(grandTotal, 2)} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{t('currency')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '0.875rem 1rem' }}>
        <Button
          label={t('close')}
          onClick={onClose}
          style={{ width: '100%', height: '2.75rem', fontWeight: 600, background: '#f1f5f9', border: 'none', color: '#334155', borderRadius: '0.625rem' }}
        />
      </div>
    </Dialog>
  );
}
