import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
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
        .doc-sticky-bar { position: fixed; bottom: 0; left: 16rem; right: 0; background: #fff; border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.1); z-index: 40; }
        @media (max-width: 768px) { .doc-create-grid { grid-template-columns: 1fr !important; } .doc-sticky-bar { left: 0 !important; } }
      `}</style>
      <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '6rem' }}>
        {/* Header with Back Button */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
              icon={<ArrowLeft style={{ width: '1.125rem', height: '1.125rem' }} />}
              onClick={() => navigate(listRoute)}
              text rounded
              style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0 }}
            />
            <div style={{ width: '2.75rem', height: '2.75rem', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(245,158,11,0.3)' }}>
              {(() => { const DocIcon = config.icon; return <DocIcon style={{ width: '1.25rem', height: '1.25rem', color: '#fff' }} />; })()}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t('new')} {config.titleShort}
              </h1>
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>{t('createNew')} {config.titleShort.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1.5px solid #e2e8f0', padding: '1.5rem' }}>
          {/* Two column layout: Partner on left, Document info on right */}
          <div className="doc-create-grid">
            {/* Partner section - Left */}
            <div>
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
                    // Full partner object selected from dropdown
                    setPartner(updatedPartner as IPartner);
                  } else {
                    // Partial update (typing in field)
                    setPartner(prev => prev ? { ...prev, ...updatedPartner } : null);
                  }
                }}
              />
            </div>

            {/* Document information - Right */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                {t('documentInformation')}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>
                    {documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <InputText
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                {config.features.expirationDate && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('expirationDate')}</label>
                    <InputText
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                )}

                {/* Due Date - Show for all document types */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('dueDate')}</label>
                  <InputText
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div style={{ marginTop: '0.5rem' }}>
            <DocumentItemsTable
              items={items}
              direction={direction}
              onItemsChange={setItems}
              showTaxColumn={config.features.showTax}
              showDiscountColumn={config.features.showDiscount}
              showPriceColumn={!(documentType === 'devis' && direction === 'achat')}
              showTotalColumn={!(documentType === 'devis' && direction === 'achat')}
            />
          </div>

          {/* Notes */}
          <div style={{ marginTop: '0.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#334155', marginBottom: '0.25rem' }}>{t('notes')}</label>
              <InputTextarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('additionalNotes')}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Totals section */}
          <div style={{ marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            <DocumentTotalsSection items={items} />
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="doc-sticky-bar">
          <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0.75rem 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                label={t('cancel')}
                onClick={() => navigate(listRoute)}
                disabled={saving}
                icon={<X style={{ width: '1rem', height: '1rem' }} />}
                outlined
              />
              <Button
                label={t('draft')}
                onClick={() => handleSave(true)}
                disabled={saving}
                loading={saving}
                icon={<Save style={{ width: '1rem', height: '1rem' }} />}
              />
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
