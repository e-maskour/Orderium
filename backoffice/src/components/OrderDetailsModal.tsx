import { Package, Phone, MapPin, Calendar } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
}

export function OrderDetailsModal({ order, onClose }: OrderDetailsModalProps) {
  const { t } = useLanguage();

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status) {
      case 'to_delivery': return { background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d' };
      case 'in_delivery': return { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #93c5fd' };
      case 'delivered': return { background: '#ecfdf5', color: '#047857', border: '1px solid #6ee7b7' };
      case 'canceled': return { background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' };
      default: return { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'to_delivery': return '📋';
      case 'in_delivery': return '🚚';
      case 'delivered': return '✅';
      case 'canceled': return '❌';
      default: return '⏳';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'to_delivery': return t('toDelivery');
      case 'in_delivery': return t('inDelivery');
      case 'delivered': return t('delivered');
      case 'canceled': return t('canceled');
      default: return status || t('unassigned');
    }
  };

  const headerContent = (
    <div>
      <div style={{ fontWeight: 700, fontSize: '1.25rem', color: '#1e293b' }}>{t('orderDetails')}</div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>#{order.orderNumber}</div>
    </div>
  );

  const footerContent = (
    <Button label={t('close')} severity="secondary" onClick={onClose} />
  );

  const effectiveStatus = order.serviceType === 2 ? 'to_delivery' : order.status || 'unassigned';

  return (
    <Dialog
      visible
      onHide={onClose}
      header={headerContent}
      footer={footerContent}
      modal
      dismissableMask
      style={{ width: '95vw', maxWidth: '56rem' }}
      breakpoints={{ '960px': '75vw', '640px': '95vw' }}
      contentStyle={{ padding: '1rem', overflowY: 'auto' }}
    >
      <div className="flex flex-column gap-3">
        {/* Order and Customer Information */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))', gap: '0.75rem' }}>
          {/* Order Information */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <h3 className="flex align-items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              <Calendar style={{ width: 16, height: 16, color: '#d97706' }} />
              {t('orderInformation')}
            </h3>
            <div className="flex flex-column gap-2">
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{t('orderNumber')}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>#{order.orderNumber}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{t('status')}</div>
                <span className="flex align-items-center gap-1" style={{ ...getStatusStyle(effectiveStatus), display: 'inline-flex', padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span>{getStatusIcon(effectiveStatus)}</span>
                  <span>{getStatusLabel(effectiveStatus)}</span>
                </span>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{t('date')}</div>
                <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                  {new Date(order.date || order.dateCreated).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              {order.note && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.125rem' }}>{t('note')}</div>
                  <div style={{ fontSize: '0.75rem', color: '#334155', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '0.5rem', padding: '0.5rem' }}>{order.note}</div>
                </div>
              )}
            </div>
          </div>

          {/* Customer Information */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '0.75rem' }}>
            <h3 className="flex align-items-center gap-2" style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
              <Package style={{ width: 16, height: 16, color: '#d97706' }} />
              {t('customerInformation')}
            </h3>
            <div className="flex flex-column gap-2">
              {order.customerName && (
                <div className="flex align-items-start gap-2">
                  <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #fbbf24, #d97706)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Package style={{ width: 14, height: 14, color: '#fff' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('customer')}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{order.customerName}</div>
                  </div>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex align-items-start gap-2">
                  <div style={{ width: 28, height: 28, background: '#d1fae5', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Phone style={{ width: 14, height: 14, color: '#059669' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('phone')}</div>
                    <a href={`tel:${order.customerPhone}`} style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669', textDecoration: 'none' }}>
                      {order.customerPhone}
                    </a>
                  </div>
                </div>
              )}
              {order.customerAddress && (
                <div className="flex align-items-start gap-2">
                  <div style={{ width: 28, height: 28, background: '#dbeafe', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <MapPin style={{ width: 14, height: 14, color: '#2563eb' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('address')}</div>
                    <div style={{ fontSize: '0.75rem', color: '#334155' }}>{order.customerAddress}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Table */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem', paddingBottom: 0 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>{t('orderItems')}</h3>
          </div>

          <div style={{ maxHeight: '16rem', overflowY: 'auto' }}>
            <DataTable
              value={order.items || []}
              size="small"
              emptyMessage={
                <div className="flex flex-column align-items-center" style={{ padding: '2rem 0', color: '#64748b' }}>
                  <Package style={{ width: 48, height: 48, color: '#cbd5e1', marginBottom: '0.75rem' }} />
                  <span>{t('noItems') || 'No items found'}</span>
                </div>
              }
              tableStyle={{ width: '100%' }}
              pt={{ tbody: { style: { background: '#fff' } } }}
            >
              <Column
                field="description"
                header={t('product')}
                headerStyle={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ padding: '0.5rem 0.75rem' }}
                body={(item: any) => (
                  <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#1e293b' }}>
                    {item.description || item.product?.name || `Product #${item.productId}`}
                  </span>
                )}
              />
              <Column
                field="quantity"
                header={t('quantity')}
                headerStyle={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ textAlign: 'center', padding: '0.5rem' }}
                body={(item: any) => (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef3c7', color: '#b45309', fontWeight: 700, padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                    {parseFloat(item.quantity || 0).toFixed(2)}
                  </span>
                )}
              />
              <Column
                field="unitPrice"
                header={t('unitPrice')}
                headerStyle={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ textAlign: 'right', padding: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: '#334155' }}
                body={(item: any) => `${parseFloat(item.unitPrice || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('currency')}`}
              />
              <Column
                field="discount"
                header={t('discount')}
                headerStyle={{ textAlign: 'right', padding: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ textAlign: 'right', padding: '0.5rem' }}
                body={(item: any) => parseFloat(item.discount || 0) > 0 ? (
                  <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.75rem' }}>
                    -{parseFloat(item.discount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                  </span>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>-</span>
                )}
              />
              <Column
                field="total"
                header={t('total')}
                headerStyle={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}
                bodyStyle={{ textAlign: 'right', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.75rem', color: '#1e293b' }}
                body={(item: any) => `${parseFloat(item.total || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${t('currency')}`}
              />
            </DataTable>
          </div>

          {/* Order Totals */}
          <div className="flex flex-column gap-1" style={{ padding: '0.75rem', borderTop: '1px solid #e2e8f0', background: '#fff' }}>
            <div className="flex justify-content-between align-items-center">
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{t('subtotal')}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>
                {(order.items || []).reduce((sum: number, item: any) => sum + parseFloat(item.total || 0), 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
              </span>
            </div>
            {parseFloat(order.discount || 0) > 0 && (
              <div className="flex justify-content-between align-items-center">
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{t('discount')}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#dc2626' }}>
                  -{parseFloat(order.discount || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('currency')}
                </span>
              </div>
            )}
            <div className="flex justify-content-between align-items-center" style={{ paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{t('grandTotal')}</span>
              <span style={{ fontSize: '1.125rem', fontWeight: 700, color: '#d97706' }}>
                {parseFloat(order.total || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '0.875rem' }}>{t('currency')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
