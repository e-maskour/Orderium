import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import { DocumentType, DocumentDirection, DocumentConfig, DocumentItem } from '../../modules/documents/types';
import { Partner } from '../../modules/partners';
import { DocumentPartnerBox, DocumentItemsTable, DocumentTotalsSection } from '../../components/documents';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { quotesService } from '../../modules/quotes/quotes.service';
import { ordersService } from '../../modules/orders/orders.service';
import AlertDialog from '../../components/AlertDialog';

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
  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    title: '',
    message: '',
    type: 'error'
  });

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [partner, setPartner] = useState<Partner | null>(null);
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
      setAlertMessage({
        title: 'Erreur',
        message: `Veuillez sélectionner un ${config.partnerLabel.toLowerCase()}`,
        type: 'error'
      });
      setShowAlert(true);
      return;
    }

    if (items.length === 0) {
      setAlertMessage({
        title: 'Erreur',
        message: 'Veuillez ajouter au moins un article',
        type: 'error'
      });
      setShowAlert(true);
      return;
    }

    if (!date) {
      setAlertMessage({
        title: 'Erreur',
        message: 'Veuillez sélectionner une date',
        type: 'error'
      });
      setShowAlert(true);
      return;
    }

    try {
      setSaving(true);

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1 
          ? itemTotal * (item.discount / 100) 
          : item.discount;
        const afterDiscount = itemTotal - discountAmount;
        return sum + afterDiscount;
      }, 0);

      const totalTax = items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1 
          ? itemTotal * (item.discount / 100) 
          : item.discount;
        const afterDiscount = itemTotal - discountAmount;
        const tax = afterDiscount * (item.tax / 100);
        return sum + tax;
      }, 0);

      const total = subtotal + totalTax;

      // Create document data
      const documentData: any = {
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
            unitPrice: item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType || 0,
            tax: item.tax || 0,
            total: itemTotal
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
        // Create bon de livraison as an order
        created = await ordersService.create({
          customerId: documentData.customerId,
          items: documentData.items.map((item: any) => ({
            productId: item.productId,
            description: item.description || item.name || 'Product',
            quantity: item.quantity,
            price: item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType || 0,
          })),
          note: documentData.notes || '',
        });
      } else {
        throw new Error('Type de document non supporté');
      }
      
      setAlertMessage({
        title: 'Succès',
        message: `${config.titleShort} créée avec succès`,
        type: 'success'
      });
      setShowAlert(true);
      
      // Construct edit route based on document type and direction
      let editRoute = '';
      if (documentType === 'facture') {
        const createdInvoice = created as any;
        editRoute = `/factures/${direction}/${createdInvoice.invoice.id}`;
      } else if (documentType === 'devis') {
        const createdQuote = created as any;
        editRoute = `/devis/${createdQuote.quote.id}`;
      } else if (documentType === 'bon_livraison') {
        const createdOrder = created as any;
        editRoute = `/bons-livraison/${createdOrder.order.id}`;
      }
      
      // Navigate to edit page after a short delay
      setTimeout(() => {
        navigate(editRoute);
      }, 1000);
      
    } catch (error: any) {
      console.error('Error creating document:', error);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || `Erreur lors de la création de la ${config.titleShort.toLowerCase()}`,
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto pb-24">
        {/* Simplified Header with Back Button */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(listRoute)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Nouvelle {config.titleShort}
              </h1>
              <p className="text-sm text-slate-500">Créer une nouvelle {config.titleShort.toLowerCase()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          {/* Two column layout: Partner on left, Document info on right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
                    setPartner(updatedPartner as Partner);
                  } else {
                    // Partial update (typing in field)
                    setPartner(prev => prev ? { ...prev, ...updatedPartner } : null);
                  }
                }}
              />
            </div>

            {/* Document information - Right */}
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="text-base font-bold text-slate-800 mb-3">
                Informations du document
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                {config.features.expirationDate && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Date d'expiration
                    </label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {documentType === 'facture' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Date d'échéance
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}
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
            />
          </div>

          {/* Notes */}
          <div className="mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Notes additionnelles..."
            />
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
              <button
                onClick={() => navigate(listRoute)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium"
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Annuler
              </button>
              <button
                onClick={() => handleSave(true)}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Brouillon'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        type={alertMessage.type}
      />
    </AdminLayout>
  );
}
