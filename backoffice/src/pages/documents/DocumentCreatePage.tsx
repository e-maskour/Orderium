import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { FormField } from '../../components/ui/form-field';
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
      <div className="max-w-7xl mx-auto pb-20 sm:pb-24">
        {/* Simplified Header with Back Button */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate(listRoute)}
              className="p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-slate-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                {t('new')} {config.titleShort}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">{t('createNew')} {config.titleShort.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg sm:rounded-lg shadow-sm border border-slate-200 p-3 sm:p-6">
          {/* Two column layout: Partner on left, Document info on right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
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
            <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4">
              <h3 className="text-sm sm:text-base font-bold text-slate-800 mb-2 sm:mb-3">
                {t('documentInformation')}
              </h3>

              <div className="space-y-2 sm:space-y-3">
                <FormField
                  label={<>{documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')} <span className="text-red-500">*</span></>}
                >
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    inputSize="sm"
                    fullWidth
                    required
                  />
                </FormField>

                {config.features.expirationDate && (
                  <FormField label={t('expirationDate')}>
                    <Input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      inputSize="sm"
                      fullWidth
                    />
                  </FormField>
                )}

                {/* Due Date - Show for all document types */}
                <FormField label={t('dueDate')}>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    inputSize="sm"
                    fullWidth
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Items table */}
          <div className="mt-2">
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
          <div className="mt-2">
            <FormField label={t('notes')}>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={t('additionalNotes')}
              />
            </FormField>
          </div>

          {/* Totals section */}
          <div className="mt-8 border-t pt-6">
            <DocumentTotalsSection items={items} />
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(listRoute)}
                disabled={saving}
                leadingIcon={X}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                loading={saving}
                loadingText={t('saving')}
                leadingIcon={Save}
              >
                {t('draft')}
              </Button>
            </div>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}
