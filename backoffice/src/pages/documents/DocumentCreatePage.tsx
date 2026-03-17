import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft, FileText } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { DocumentType, DocumentDirection, DocumentConfig, DocumentItem } from '../../modules/documents/types';
import { Partner, IPartner } from '../../modules/partners';
import { DocumentPartnerBox, DocumentItemsTable, DocumentTotalsSection } from '../../components/documents';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { quotesService } from '../../modules/quotes/quotes.service';
import { ordersService } from '../../modules/orders/orders.service';
import { toastSuccess, toastError } from '../../services/toast.service';
import { useLanguage } from '../../context/LanguageContext';

interface DocumentCreatePageProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  config: DocumentConfig;
  listRoute: string;
}

export default function DocumentCreatePage({
  documentType,
  direction,
  config,
  listRoute
}: DocumentCreatePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  // Expiration date is 1 month from now by default for quotes
  const [expirationDate, setExpirationDate] = useState(new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]);
  const [partner, setPartner] = useState<IPartner | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState('');

  const isVente = direction === 'vente';

  // Auto-fill data if coming from devis
  useEffect(() => {
    const state = location.state as any;
    if (state?.fromDevis && state?.devisData) {
      const { partner: devisPartner, date: devisDate, dueDate: devisDueDate, items: devisItems, notes: devisNotes } = state.devisData;
      if (devisPartner) setPartner(devisPartner);
      if (devisDate) setDate(devisDate);
      if (devisDueDate) setDueDate(devisDueDate);
      if (devisItems) setItems(devisItems);
      if (devisNotes) setNotes(devisNotes);
    }
  }, [location.state]);

  const handleSave = async (isDraft: boolean) => {
    // Validation
    if (!partner) {
      toastError(`${t('pleaseSelect')} ${config.partnerLabel.toLowerCase()}`);
      return;
    }

    if (items.length === 0) {
      toastError(t('pleaseAddAtLeastOneItem'));
      return;
    }

    if (!date) {
      toastError(t('pleaseSelectDate'));
      return;
    }

    try {
      setSaving(true);

      // For demande de prix, don't calculate totals (no prices)
      const isDemandePrix = documentType === 'devis' && direction === 'achat';

      // Calculate totals
      const subtotal = isDemandePrix ? null : items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1
          ? itemTotal * (item.discount / 100)
          : item.discount;
        const afterDiscount = itemTotal - discountAmount;
        return sum + afterDiscount;
      }, 0);

      const totalTax = isDemandePrix ? null : items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1
          ? itemTotal * (item.discount / 100)
          : item.discount;
        const afterDiscount = itemTotal - discountAmount;
        const tax = afterDiscount * (item.tax / 100);
        return sum + tax;
      }, 0);

      const total = isDemandePrix ? null : (subtotal! + totalTax!);

      // Create document data
      const documentData: any = {
        direction: direction === 'achat' ? 'ACHAT' : 'VENTE',
        customerId: isVente ? partner.id : undefined,
        supplierId: isVente ? undefined : partner.id,
        customerName: isVente ? partner.name : undefined,
        supplierName: isVente ? undefined : partner.name,
        date,
        dueDate: dueDate || undefined,
        expirationDate: config.features.expirationDate && expirationDate ? expirationDate : undefined,
        subtotal,
        tax: totalTax,
        discount: 0,
        discountType: 0,
        total,
        notes: notes || undefined,
        items: items.map(item => {
          // For demande de prix, send null for unitPrice and total
          const isDemandePrix = documentType === 'devis' && direction === 'achat';

          // Calculate item total (HT: before tax)
          const itemSubtotal = item.quantity * item.unitPrice;
          const discountAmount = item.discountType === 1
            ? itemSubtotal * (item.discount / 100)
            : item.discount;
          const itemTotal = itemSubtotal - discountAmount;

          return {
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
            unitPrice: isDemandePrix ? null : item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType || 0,
            tax: isDemandePrix ? null : (item.tax || 0),
            total: isDemandePrix ? null : itemTotal
          };
        })
      };

      // Call appropriate service based on document type
      let created;
      if (documentType === 'facture') {
        created = await invoicesService.create(documentData);
      } else if (documentType === 'devis') {
        created = await quotesService.create(documentData);
      } else if (documentType === 'bon_livraison') {
        // Create bon de livraison/achat as an order with all calculated totals
        created = await ordersService.create({
          customerId: isVente ? documentData.customerId : undefined,
          customerName: isVente ? documentData.customerName : undefined,
          customerPhone: isVente ? documentData.customerPhone : undefined,
          customerAddress: isVente ? documentData.customerAddress : undefined,
          supplierId: isVente ? undefined : documentData.supplierId,
          supplierName: isVente ? undefined : documentData.supplierName,
          supplierPhone: isVente ? undefined : documentData.supplierPhone,
          supplierAddress: isVente ? undefined : documentData.supplierAddress,
          date: documentData.date,
          dueDate: documentData.dueDate,
          subtotal: documentData.subtotal,
          tax: documentData.tax,
          discount: documentData.discount,
          discountType: documentData.discountType,
          total: documentData.total,
          items: documentData.items.map((item: any) => ({
            productId: item.productId,
            description: item.description || item.name || 'Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType || 0,
            tax: item.tax,
            total: item.total,
          })),
          note: documentData.notes || '',
        });
      } else {
        throw new Error(t('unsupportedDocumentType'));
      }

      toastSuccess(`${config.titleShort} ${t('createdSuccessfully')}`);

      // Construct edit route based on document type and direction
      let editRoute = '';
      if (documentType === 'facture') {
        const createdId = (created as any).invoice?.id ?? (created as any).id;
        editRoute = `/factures/${direction}/${createdId}`;
      } else if (documentType === 'devis') {
        const createdId = (created as any).quote?.id ?? (created as any).id;
        // For vente devis use /devis/:id, for achat devis (demande de prix) use /demande-prix/:id
        editRoute = direction === 'vente'
          ? `/devis/${createdId}`
          : `/demande-prix/${createdId}`;
      } else if (documentType === 'bon_livraison') {
        const createdId = (created as any).id;
        // For vente bon use /bons-livraison/:id, for achat bon use /bon-achat/:id
        editRoute = direction === 'vente'
          ? `/bons-livraison/${createdId}`
          : `/bon-achat/${createdId}`;
      }

      // Navigate to edit page after a short delay
      setTimeout(() => {
        navigate(editRoute);
      }, 1000);

    } catch (error: any) {
      console.error('Error creating document:', error);
      toastError(error.message || `${t('error')} lors de la création de la ${config.titleShort.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <style>{`
        .doc-create-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        .doc-sticky-bar { position: fixed; bottom: 0; left: 16rem; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-top: 1.5px solid #e2e8f0; box-shadow: 0 -4px 20px rgba(0,0,0,0.08); z-index: 40; }
        .doc-field-label { display: block; font-size: 0.6875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.375rem; }
        .doc-section-card { background: #ffffff; border-radius: 0.75rem; border: 1.5px solid #e2e8f0; padding: 1.25rem; }
        .doc-section-title { font-size: 0.875rem; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
        .doc-section-accent { width: 0.25rem; height: 1.25rem; background: linear-gradient(to bottom, #235ae4, #1a47b8); border-radius: 2px; flex-shrink: 0; }
        .doc-cal { position: relative !important; display: block !important; }
        .doc-cal .p-inputtext { padding-right: 2.5rem !important; width: 100% !important; border-top-right-radius: var(--orderium-radius-md, 6px) !important; border-bottom-right-radius: var(--orderium-radius-md, 6px) !important; }
        .doc-cal .p-datepicker-trigger { position: absolute !important; right: 0 !important; top: 0 !important; bottom: 0 !important; height: 100% !important; background: transparent !important; border: none !important; color: #94a3b8 !important; box-shadow: none !important; padding: 0 0.5rem !important; }
        .doc-cal .p-datepicker-trigger:hover { color: var(--form-input-border-focus) !important; background: transparent !important; }
        @media (max-width: 768px) {
          .doc-create-grid { grid-template-columns: 1fr !important; }
          .doc-sticky-bar { left: 0 !important; }
        }
      `}</style>
      <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '6rem' }}>

        {/* ── Page Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          marginBottom: '0.75rem',
          padding: '1.125rem 1.375rem',
          background: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
          border: '1.5px solid #e2e8f0'
        }}>
          <Button
            icon={<ArrowLeft style={{ width: '1.125rem', height: '1.125rem' }} />}
            onClick={() => navigate(listRoute)}
            style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', borderRadius: '0.5rem' }}
          />
          <div style={{
            width: '2.75rem', height: '2.75rem', flexShrink: 0,
            background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
            borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(35,90,228,0.4)'
          }}>
            {(() => { const DocIcon = config.icon; return <DocIcon style={{ width: '1.375rem', height: '1.375rem', color: '#fff' }} />; })()}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
              {t('new')} {config.titleShort}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: 0 }}>{t('createNew')} {config.titleShort.toLowerCase()}</p>
          </div>
          {/* New badge */}
          <div style={{
            padding: '0.375rem 0.875rem', borderRadius: '9999px',
            background: '#eff6ff',
            border: '1px solid rgba(35,90,228,0.2)'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#235ae4' }}>NOUVEAU</span>
          </div>
        </div>

        {/* ── Main Content Card ── */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '1rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Top accent bar */}
          <div style={{ height: '3px', background: 'linear-gradient(to right, #235ae4, #1a47b8)' }} />

          <div style={{ padding: '1.5rem' }}>
            {/* Two column layout: Partner on left, Document info on right */}
            <div className="doc-create-grid">
              {/* Partner section */}
              <DocumentPartnerBox
                direction={direction}
                partnerId={partner?.id}
                partnerName={partner?.name}
                partnerPhone={partner?.phoneNumber}
                partnerAddress={partner?.address || undefined}
                partnerIce={partner?.ice || undefined}
                deliveryAddress={partner?.deliveryAddress || undefined}
                onPartnerChange={(updatedPartner) => {
                  if ('id' in updatedPartner && 'name' in updatedPartner && 'phoneNumber' in updatedPartner) {
                    setPartner(updatedPartner as IPartner);
                  } else {
                    setPartner(prev => prev ? { ...prev, ...updatedPartner } : null);
                  }
                }}
              />

              {/* Document information */}
              <div style={{
                backgroundColor: '#ffffff', borderRadius: '0.875rem',
                border: '1.5px solid #e2e8f0', overflow: 'hidden',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
              }}>
                {/* Section header */}
                <div style={{
                  padding: '0.875rem 1.125rem',
                  background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                  borderBottom: '1.5px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', gap: '0.625rem'
                }}>
                  <div style={{
                    width: '2rem', height: '2rem',
                    background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
                    borderRadius: '0.5rem', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(35,90,228,0.4)'
                  }}>
                    <FileText style={{ width: '1rem', height: '1rem', color: '#fff' }} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
                      {t('documentInformation')}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                      {documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')}
                    </p>
                  </div>
                </div>
                <div style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label className="doc-field-label">
                      {documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')} <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <Calendar
                      value={date ? new Date(date) : null}
                      onChange={(e) => setDate(e.value ? (e.value as Date).toISOString().split('T')[0] : '')}
                      dateFormat="dd/mm/yy"
                      showIcon
                      className="doc-cal"
                      style={{ width: '100%' }}
                      inputStyle={{ height: '2.5rem', width: '100%' }}
                    />
                  </div>

                  {config.features.expirationDate && (
                    <div>
                      <label className="doc-field-label">{t('expirationDate')}</label>
                      <Calendar
                        value={expirationDate ? new Date(expirationDate) : null}
                        onChange={(e) => setExpirationDate(e.value ? (e.value as Date).toISOString().split('T')[0] : '')}
                        dateFormat="dd/mm/yy"
                        showIcon
                        className="doc-cal"
                        style={{ width: '100%' }}
                        inputStyle={{ height: '2.5rem', width: '100%' }}
                      />
                    </div>
                  )}

                  <div>
                    <label className="doc-field-label">{t('dueDate')}</label>
                    <Calendar
                      value={dueDate ? new Date(dueDate) : null}
                      onChange={(e) => setDueDate(e.value ? (e.value as Date).toISOString().split('T')[0] : '')}
                      dateFormat="dd/mm/yy"
                      showIcon
                      className="doc-cal"
                      style={{ width: '100%' }}
                      inputStyle={{ height: '2.5rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.5rem 0 1rem' }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, #e2e8f0, transparent)' }} />
            </div>

            {/* Items table */}
            <DocumentItemsTable
              items={items}
              direction={direction}
              onItemsChange={setItems}
              showTaxColumn={config.features.showTax}
              showDiscountColumn={config.features.showDiscount}
              showPriceColumn={!(documentType === 'devis' && direction === 'achat')}
              showTotalColumn={!(documentType === 'devis' && direction === 'achat')}
            />

            {/* Notes + Totals Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'flex-start' }}>
              {/* Notes */}
              <div style={{ minWidth: 0 }}>
                <div style={{
                  backgroundColor: '#ffffff', borderRadius: '0.875rem',
                  border: '1.5px solid #e2e8f0', overflow: 'hidden',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
                }}>
                  <div style={{
                    padding: '0.75rem 1.125rem',
                    background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
                    borderBottom: '1.5px solid #e2e8f0',
                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                  }}>
                    <div style={{ width: '0.25rem', height: '1.25rem', background: 'linear-gradient(to bottom, #94a3b8, #64748b)', borderRadius: '2px' }} />
                    <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{t('notes')}</h3>
                  </div>
                  <div style={{ padding: '1rem 1.125rem' }}>
                    <InputTextarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={4}
                      placeholder={t('additionalNotes')}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div style={{ minWidth: 0 }}>
                <DocumentTotalsSection items={items} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Sticky Bottom Action Bar ── */}
        <div className="doc-sticky-bar">
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0.875rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                label={t('cancel')}
                onClick={() => navigate(listRoute)}
                disabled={saving}
                icon={<X style={{ width: '1rem', height: '1rem' }} />}
                outlined
                severity="secondary"
              />
              <Button
                label={t('draft')}
                onClick={() => handleSave(true)}
                disabled={saving}
                loading={saving}
                icon={<Save style={{ width: '1rem', height: '1rem' }} />}
                style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none', boxShadow: '0 2px 10px rgba(35,90,228,0.35)' }}
              />
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
