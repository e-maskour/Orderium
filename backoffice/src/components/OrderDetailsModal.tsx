import { Package, Phone, MapPin, X, Printer, ChevronRight, Pencil, Trash2, Plus, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { formatAmount } from '@orderium/ui';
import { useState, useEffect, useRef } from 'react';
import { productsService } from '../modules/products';

interface OrderDetailsModalProps {
  order: any;
  onClose: () => void;
  onStatusChange?: (orderId: number, status: string) => void;
  onPrintReceipt?: () => void;
  onOrderUpdate?: (orderId: number, data: any) => void;
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

export function OrderDetailsModal({ order, onClose, onStatusChange, onPrintReceipt, onOrderUpdate }: OrderDetailsModalProps) {
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
  const isEditable = !['delivered', 'cancelled', 'canceled'].includes(status);
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<{ description: string; quantity: string; unitPrice: string; productId?: number } | null>(null);
  const [productSuggestions, setProductSuggestions] = useState<{ id: number; name: string; price: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const computedItems = editMode ? editItems : items;
  const computedSubtotal = editMode
    ? editItems.reduce((s: number, i: any) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unitPrice) || 0), 0)
    : parseFloat(order.subtotal || order.total || 0);
  const computedTotal = editMode ? Math.max(0, computedSubtotal - globalDiscount) : grandTotal;

  const enterEditMode = () => {
    setEditItems(items.map((i: any) => ({
      ...i,
      quantity: String(parseFloat(i.quantity || 0)),
      unitPrice: String(parseFloat(i.unitPrice || 0)),
    })));
    setNewItem(null);
    setEditMode(true);
  };

  const cancelEditMode = () => {
    setEditMode(false);
    setEditItems([]);
    setNewItem(null);
    setProductSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIdx(null);
    setShowAddSheet(false);
  };

  const handleSave = () => {
    const allItems = [
      ...editItems,
      ...(newItem && newItem.description
        ? [{ description: newItem.description, quantity: newItem.quantity, unitPrice: newItem.unitPrice, productId: newItem.productId, discount: 0, discountType: 0, tax: 0 }]
        : []),
    ];
    const mappedItems = allItems.map((item: any) => ({
      productId: item.productId || undefined,
      description: item.description || item.product?.name || '',
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
      discount: parseFloat(item.discount || 0),
      discountType: item.discountType || 0,
      tax: parseFloat(item.tax || 0),
      total: (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0),
    }));
    const subtotal = mappedItems.reduce((s: number, i: any) => s + i.total, 0);
    const total = Math.max(0, subtotal - globalDiscount);
    onOrderUpdate?.(order.id, { items: mappedItems, subtotal, total, discount: globalDiscount, discountType: order.discountType || 0, tax: 0 });
    cancelEditMode();
  };

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
      contentStyle={{ padding: 0, borderRadius: isMobile ? 0 : '0.875rem', overflow: 'hidden', height: isMobile ? '100dvh' : '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {editMode && (
                <button
                  type="button"
                  onClick={() => {
                    setNewItem({ description: '', quantity: '1', unitPrice: '0' });
                    if (isMobile) setShowAddSheet(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  <Plus style={{ width: '0.75rem', height: '0.75rem' }} />
                  {isAr ? 'إضافة' : 'Ajouter'}
                </button>
              )}
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{editMode ? editItems.length : items.length} article{(editMode ? editItems.length : items.length) !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {computedItems.length === 0 && !newItem ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem' }}>Aucun article</div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {computedItems.map((item: any, idx: number) => {
                const qty = parseFloat(item.quantity || 0);
                const unitPrice = parseFloat(item.unitPrice || 0);
                const disc = parseFloat(item.discount || 0);
                const lineTotal = editMode ? qty * unitPrice : parseFloat(item.total || 0);
                const name = item.description || item.product?.name || `#${item.productId}`;
                return (
                  <div key={idx} ref={el => { itemRowRefs.current[idx] = el; }} style={{ padding: editMode && isMobile ? '0.625rem 0.75rem' : '0.5rem 0.75rem', borderBottom: idx < computedItems.length - 1 || (!isMobile && newItem !== null) ? '1px solid #f1f5f9' : 'none', display: 'flex', flexDirection: editMode && isMobile ? 'column' : 'row', alignItems: editMode && isMobile ? 'stretch' : 'center', gap: editMode && isMobile ? '0.375rem' : '0.5rem', direction: isAr ? 'rtl' : 'ltr', transition: 'background-color 0.5s ease, box-shadow 0.5s ease', background: editMode && highlightedIdx === idx ? '#fef9c3' : 'transparent', boxShadow: editMode && highlightedIdx === idx ? 'inset 0 0 0 2px #f59e0b' : 'none', borderRadius: '0.25rem' }}>
                    {editMode ? (
                      isMobile ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <p style={{ margin: 0, flex: 1, fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: isAr ? 'rtl' : 'ltr' }}>{name}</p>
                            <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} style={{ width: '2.25rem', height: '2.25rem', borderRadius: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Trash2 style={{ width: '1rem', height: '1rem' }} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} style={{ width: '50%', height: '2.5rem', padding: '0 0.5rem', borderRadius: '0.5rem', border: '1.5px solid #fde68a', fontSize: '0.9375rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', textAlign: 'center', boxSizing: 'border-box' }} />
                            <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))} style={{ width: '50%', height: '2.5rem', padding: '0 0.5rem', borderRadius: '0.5rem', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', background: '#fff', textAlign: 'right', boxSizing: 'border-box' }} />
                          </div>
                        </>
                      ) : (
                        <>
                          <input type="number" min="0" step="0.01" value={item.quantity} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))} style={{ width: '3.5rem', height: '2rem', padding: '0 0.4rem', borderRadius: '0.375rem', border: '1.5px solid #cbd5e1', fontSize: '0.8125rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', textAlign: 'center' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: isAr ? 'rtl' : 'ltr' }}>{name}</p>
                          </div>
                          <input type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => setEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))} style={{ width: '5rem', height: '2rem', padding: '0 0.4rem', borderRadius: '0.375rem', border: '1.5px solid #cbd5e1', fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', background: '#fff', textAlign: 'right' }} />
                          <button type="button" onClick={() => setEditItems(prev => prev.filter((_, i) => i !== idx))} style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Trash2 style={{ width: '0.875rem', height: '0.875rem' }} />
                          </button>
                        </>
                      )
                    ) : (
                      <>
                        <div style={{ minWidth: '1.875rem', height: '1.875rem', background: '#fef3c7', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#b45309' }}>{Number.isInteger(qty) ? qty : qty.toFixed(1)}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: isAr ? 'right' : 'left' }}>
                          <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', direction: isAr ? 'rtl' : 'ltr' }}>{name}</p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', direction: 'ltr', textAlign: isAr ? 'right' : 'left' }}>
                            {formatAmount(unitPrice, 2)} × {Number.isInteger(qty) ? qty : qty.toFixed(2)}
                            {disc > 0 && <span style={{ color: '#dc2626' }}> − {formatAmount(disc, 2)}</span>}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>{formatAmount(lineTotal, 2)} <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>{t('currency')}</span></span>
                      </>
                    )}
                  </div>
                );
              })}
              {!isMobile && editMode && newItem !== null && (
                <div style={{ padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', borderTop: '1px solid #bbf7d0' }}>
                  <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
                    <input
                      type="text"
                      placeholder={isAr ? 'ابحث عن مقال...' : 'Rechercher un produit...'}
                      value={newItem.description}
                      autoFocus
                      onChange={e => {
                        const val = e.target.value;
                        setNewItem(prev => prev ? { ...prev, description: val, productId: undefined } : null);
                        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                        if (val.trim().length < 1) { setProductSuggestions([]); setShowSuggestions(false); return; }
                        searchTimerRef.current = setTimeout(async () => {
                          try {
                            const res = await productsService.getProducts({ search: val, limit: 10 });
                            setProductSuggestions(res.products.map(p => ({ id: p.id, name: p.name, price: p.price })));
                            setShowSuggestions(true);
                          } catch { setProductSuggestions([]); setShowSuggestions(false); }
                        }, 280);
                      }}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onFocus={() => { if (productSuggestions.length > 0) setShowSuggestions(true); }}
                      style={{ width: '100%', height: '2rem', padding: '0 0.5rem', borderRadius: '0.375rem', border: '1.5px solid #86efac', fontSize: '0.8125rem' }}
                    />
                    {showSuggestions && productSuggestions.length > 0 && (
                      <div style={{ position: 'absolute', bottom: '2.25rem', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem', boxShadow: '0 -4px 16px rgba(0,0,0,0.12)', zIndex: 9999, maxHeight: '12rem', overflowY: 'auto' }}>
                        {productSuggestions.map(p => (
                          <div
                            key={p.id}
                            onMouseDown={() => {
                              const existingIndex = editItems.findIndex(ei => ei.productId === p.id);
                              if (existingIndex !== -1) {
                                setShowSuggestions(false); setProductSuggestions([]); setNewItem(null);
                                setHighlightedIdx(existingIndex);
                                setTimeout(() => { itemRowRefs.current[existingIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
                                setTimeout(() => setHighlightedIdx(null), 2000);
                              } else {
                                setNewItem(prev => prev ? { ...prev, description: p.name, unitPrice: String(p.price), productId: p.id } : null);
                                setShowSuggestions(false); setProductSuggestions([]);
                              }
                            }}
                            style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', borderBottom: '1px solid #f1f5f9' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                            <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{formatAmount(p.price, 2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" min="0" placeholder={isAr ? 'الكمية' : 'Qté'} value={newItem.quantity} onChange={e => setNewItem(prev => prev ? { ...prev, quantity: e.target.value } : null)} style={{ width: '3.5rem', height: '2rem', padding: '0 0.4rem', borderRadius: '0.375rem', border: '1.5px solid #86efac', fontSize: '0.8125rem', textAlign: 'center' }} />
                  <input type="number" min="0" placeholder="PU" value={newItem.unitPrice} onChange={e => setNewItem(prev => prev ? { ...prev, unitPrice: e.target.value } : null)} style={{ width: '5rem', height: '2rem', padding: '0 0.4rem', borderRadius: '0.375rem', border: '1.5px solid #86efac', fontSize: '0.8125rem', textAlign: 'right' }} />
                  <button type="button" onClick={() => { if (newItem.description && parseFloat(newItem.quantity) > 0) { setEditItems(prev => [...prev, { description: newItem.description, quantity: newItem.quantity, unitPrice: newItem.unitPrice, productId: newItem.productId, discount: 0, discountType: 0, tax: 0 }]); setNewItem(null); setProductSuggestions([]); } }} style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#dcfce7', border: '1px solid #86efac', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Check style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                  <button type="button" onClick={() => { setNewItem(null); setProductSuggestions([]); setShowSuggestions(false); }} style={{ width: '2rem', height: '2rem', borderRadius: '0.375rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X style={{ width: '0.875rem', height: '0.875rem' }} />
                  </button>
                </div>
              )}
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
          <span style={{ fontSize: '1.125rem', fontWeight: 800, color: '#fff' }}>{formatAmount(computedTotal, 2)} <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{t('currency')}</span></span>
        </div>
      </div>

      <div style={{ background: '#fff', borderTop: '1px solid #e2e8f0', padding: '0.75rem', flexShrink: 0 }}>
        {editMode ? (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              label={isAr ? 'حفظ' : 'Enregistrer'}
              onClick={handleSave}
              icon={<Check style={{ width: '0.8rem', height: '0.8rem', marginInlineEnd: '0.25rem' }} />}
              style={{ flex: 1, height: '2.5rem', fontWeight: 700, background: 'linear-gradient(135deg,#1d4ed8,#235ae4)', border: 'none', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
            />
            <Button
              label={isAr ? 'إلغاء' : 'Annuler'}
              onClick={cancelEditMode}
              style={{ flex: 1, height: '2.5rem', fontWeight: 600, background: '#f1f5f9', border: 'none', color: '#334155', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
            />
          </div>
        ) : (
          <>
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
              {onOrderUpdate && isEditable && (
                <Button
                  label={isAr ? 'تعديل' : 'Modifier'}
                  onClick={enterEditMode}
                  icon={<Pencil style={{ width: '0.8rem', height: '0.8rem', marginInlineEnd: '0.25rem' }} />}
                  style={{ flex: 1, height: '2.5rem', fontWeight: 600, background: '#eff6ff', border: '1.5px solid #bfdbfe', color: '#1d4ed8', borderRadius: '0.5rem', fontSize: '0.8125rem' }}
                />
              )}
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
          </>
        )}
      </div>

      {/* ── Mobile Add Article Bottom Sheet ── */}
      {isMobile && showAddSheet && (
        <>
          <div
            onMouseDown={() => { setShowAddSheet(false); setNewItem(null); setProductSuggestions([]); setShowSuggestions(false); }}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200 }}
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', borderRadius: '1rem 1rem 0 0', zIndex: 201, padding: '0 1rem 1.5rem', boxShadow: '0 -8px 32px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.625rem' }}>
              <div style={{ width: '2.5rem', height: '0.25rem', background: '#cbd5e1', borderRadius: '9999px' }} />
            </div>
            <p style={{ margin: '0 0 1rem', fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{isAr ? 'إضافة مقال' : 'Ajouter un article'}</p>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input
                type="text"
                autoFocus
                placeholder={isAr ? 'ابحث عن مقال...' : 'Rechercher un produit...'}
                value={newItem?.description ?? ''}
                onChange={e => {
                  const val = e.target.value;
                  setNewItem(prev => prev ? { ...prev, description: val, productId: undefined } : { description: val, quantity: '1', unitPrice: '0' });
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (val.trim().length < 1) { setProductSuggestions([]); setShowSuggestions(false); return; }
                  searchTimerRef.current = setTimeout(async () => {
                    try {
                      const res = await productsService.getProducts({ search: val, limit: 8 });
                      setProductSuggestions(res.products.map(p => ({ id: p.id, name: p.name, price: p.price })));
                      setShowSuggestions(true);
                    } catch { setProductSuggestions([]); setShowSuggestions(false); }
                  }, 280);
                }}
                style={{ width: '100%', height: '2.75rem', padding: '0 0.875rem', borderRadius: '0.625rem', border: '1.5px solid #bfdbfe', fontSize: '0.9375rem', boxSizing: 'border-box' }}
              />
              {showSuggestions && productSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.625rem', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', zIndex: 202, maxHeight: '10rem', overflowY: 'auto', marginTop: '0.25rem' }}>
                  {productSuggestions.map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => {
                        const existingIndex = editItems.findIndex(ei => ei.productId === p.id);
                        if (existingIndex !== -1) {
                          setShowAddSheet(false); setNewItem(null); setProductSuggestions([]); setShowSuggestions(false);
                          setHighlightedIdx(existingIndex);
                          setTimeout(() => itemRowRefs.current[existingIndex]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
                          setTimeout(() => setHighlightedIdx(null), 2000);
                        } else {
                          setNewItem(prev => prev ? { ...prev, description: p.name, unitPrice: String(p.price), productId: p.id } : { description: p.name, quantity: '1', unitPrice: String(p.price), productId: p.id });
                          setShowSuggestions(false); setProductSuggestions([]);
                        }
                      }}
                      style={{ padding: '0.75rem 0.875rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f0fdf4')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.8125rem' }}>{formatAmount(p.price, 2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>{isAr ? 'الكمية' : 'Quantité'}</label>
                <input type="number" min="0" value={newItem?.quantity ?? '1'} onChange={e => setNewItem(prev => prev ? { ...prev, quantity: e.target.value } : { description: '', quantity: e.target.value, unitPrice: '0' })} style={{ width: '100%', height: '2.75rem', padding: '0 0.875rem', borderRadius: '0.625rem', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem', textAlign: 'center', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>{isAr ? 'السعر' : 'Prix unitaire'}</label>
                <input type="number" min="0" value={newItem?.unitPrice ?? '0'} onChange={e => setNewItem(prev => prev ? { ...prev, unitPrice: e.target.value } : { description: '', quantity: '1', unitPrice: e.target.value })} style={{ width: '100%', height: '2.75rem', padding: '0 0.875rem', borderRadius: '0.625rem', border: '1.5px solid #e2e8f0', fontSize: '0.9375rem', textAlign: 'right', boxSizing: 'border-box' }} />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (newItem && newItem.description && parseFloat(newItem.quantity) > 0) {
                  setEditItems(prev => [...prev, { description: newItem.description, quantity: newItem.quantity, unitPrice: newItem.unitPrice, productId: newItem.productId, discount: 0, discountType: 0, tax: 0 }]);
                  setNewItem(null); setProductSuggestions([]); setShowSuggestions(false); setShowAddSheet(false);
                }
              }}
              style={{ width: '100%', height: '2.875rem', borderRadius: '0.625rem', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', color: '#fff', fontSize: '0.9375rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.5rem' }}
            >
              {isAr ? '✓ إضافة' : '✓ Ajouter'}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddSheet(false); setNewItem(null); setProductSuggestions([]); setShowSuggestions(false); }}
              style={{ width: '100%', height: '2.5rem', borderRadius: '0.625rem', background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              {isAr ? 'إلغاء' : 'Annuler'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}


