import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, X, CheckCircle, XCircle, ChevronDown, FileText, Truck, ArrowLeft, DollarSign, Clock, AlertCircle, Share2, PenTool, Ban, Receipt, History } from 'lucide-react';
import { DocumentType, DocumentDirection, DocumentConfig, DocumentItem } from '../../modules/documents/types';
import { Partner, partnersService } from '../../modules/partners';
import { DocumentPartnerBox, DocumentItemsTable, DocumentTotalsSection } from '../../components/documents';
import { ShareQuoteDialog } from '../../components/documents/ShareQuoteDialog';
import { invoicesService } from '../../modules/invoices/invoices.service';
import { quotesService } from '../../modules/quotes/quotes.service';
import { ordersService } from '../../modules/orders/orders.service';
import AlertDialog from '../../components/AlertDialog';
import ConfirmDialog from '../../components/ConfirmDialog';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';

interface DocumentEditPageProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  config: DocumentConfig;
  listRoute: string;
}

export default function DocumentEditPage({
  documentType,
  direction,
  config,
  listRoute
}: DocumentEditPageProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    title: '',
    message: '',
    type: 'error'
  });
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [showDevalidateConfirm, setShowDevalidateConfirm] = useState(false);
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCreateInvoiceConfirm, setShowCreateInvoiceConfirm] = useState(false);
  const [showCreateBonConfirm, setShowCreateBonConfirm] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const [showUnsignConfirm, setShowUnsignConfirm] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenExpiry, setShareTokenExpiry] = useState<Date | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Document state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [partner, setPartner] = useState<Partner | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string>('draft');
  const [isValidated, setIsValidated] = useState(false);
  const [signedBy, setSignedBy] = useState<string>('');
  const [signedDate, setSignedDate] = useState<Date | null>(null);
  const [clientNotes, setClientNotes] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [remainingAmount, setRemainingAmount] = useState<number>(0);

  const isVente = direction === 'vente';

  // Helper function to get payment status badge configuration
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircle,
          label: 'Payé',
          gradient: 'from-green-50 to-emerald-50',
          border: 'border-green-200',
          iconBg: 'bg-green-500',
          textColor: 'text-green-700'
        };
      case 'partial':
        return {
          icon: Clock,
          label: 'Partiel',
          gradient: 'from-blue-50 to-cyan-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-700'
        };
      case 'unpaid':
        return {
          icon: AlertCircle,
          label: 'Impayé',
          gradient: 'from-red-50 to-rose-50',
          border: 'border-red-200',
          iconBg: 'bg-red-500',
          textColor: 'text-red-700'
        };
      default: // draft
        return {
          icon: FileText,
          label: 'Brouillon',
          gradient: 'from-slate-50 to-gray-50',
          border: 'border-slate-300',
          iconBg: 'bg-slate-500',
          textColor: 'text-slate-700'
        };
    }
  };

  // Helper function to get devis status badge configuration
  const getDevisStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return {
          icon: FileText,
          label: 'Ouvert',
          gradient: 'from-blue-50 to-sky-50',
          border: 'border-blue-200',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-700'
        };
      case 'signed':
        return {
          icon: CheckCircle,
          label: 'Signée (à facturer)',
          gradient: 'from-green-50 to-emerald-50',
          border: 'border-green-200',
          iconBg: 'bg-green-500',
          textColor: 'text-green-700'
        };
      case 'closed':
        return {
          icon: XCircle,
          label: 'Non signée (fermée)',
          gradient: 'from-red-50 to-rose-50',
          border: 'border-red-200',
          iconBg: 'bg-red-500',
          textColor: 'text-red-700'
        };
      case 'delivered':
        return {
          icon: Truck,
          label: 'À livrer',
          gradient: 'from-orange-50 to-amber-50',
          border: 'border-orange-200',
          iconBg: 'bg-orange-500',
          textColor: 'text-orange-700'
        };
      case 'invoiced':
        return {
          icon: DollarSign,
          label: 'Facturée',
          gradient: 'from-purple-50 to-violet-50',
          border: 'border-purple-200',
          iconBg: 'bg-purple-500',
          textColor: 'text-purple-700'
        };
      default: // draft
        return {
          icon: FileText,
          label: 'Brouillon',
          gradient: 'from-slate-50 to-gray-50',
          border: 'border-slate-300',
          iconBg: 'bg-slate-500',
          textColor: 'text-slate-700'
        };
    }
  };

  // Helper function to get bon de livraison status badge configuration
  const getBonStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return {
          icon: CheckCircle,
          label: 'Validée',
          gradient: 'from-sky-50 to-blue-50',
          border: 'border-sky-200',
          iconBg: 'bg-sky-500',
          textColor: 'text-sky-700'
        };
      case 'in_progress':
        return {
          icon: Truck,
          label: 'En cours',
          gradient: 'from-cyan-50 to-teal-50',
          border: 'border-cyan-200',
          iconBg: 'bg-cyan-500',
          textColor: 'text-cyan-700'
        };
      case 'delivered':
        return {
          icon: Truck,
          label: 'Livrée',
          gradient: 'from-teal-50 to-emerald-50',
          border: 'border-teal-200',
          iconBg: 'bg-teal-500',
          textColor: 'text-teal-700'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Annulée',
          gradient: 'from-rose-50 to-red-50',
          border: 'border-rose-200',
          iconBg: 'bg-rose-500',
          textColor: 'text-rose-700'
        };
      case 'invoiced':
        return {
          icon: DollarSign,
          label: 'Facturé',
          gradient: 'from-purple-50 to-violet-50',
          border: 'border-purple-200',
          iconBg: 'bg-purple-500',
          textColor: 'text-purple-700'
        };
      default: // draft
        return {
          icon: FileText,
          label: 'Brouillon',
          gradient: 'from-slate-50 to-gray-50',
          border: 'border-slate-300',
          iconBg: 'bg-slate-500',
          textColor: 'text-slate-700'
        };
    }
  };

  useEffect(() => {
    loadDocument();
  }, [id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadDocument = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Call appropriate service based on document type
      let data: any;
      let doc: any;
      if (documentType === 'facture') {
        data = await invoicesService.getById(Number(id));
        doc = data.invoice;
      } else if (documentType === 'devis') {
        data = await quotesService.getById(Number(id));
        doc = data.quote;
      } else if (documentType === 'bon_livraison') {
        data = await ordersService.getById(Number(id));
        doc = data.order; // Extract the order from the API response
      }

      if (!data || !doc) return;
      
      // Set form values
      const docNumber = documentType === 'facture' ? (doc as any).invoiceNumber :
                       documentType === 'devis' ? (doc as any).quoteNumber :
                       (doc as any).orderNumber;
      setInvoiceNumber(docNumber);
      
      // Handle date fields based on document type and available data
      const dateValue = doc.date || (doc as any).dateCreated || (doc as any).createdAt;
      setDate(dateValue ? dateValue.split('T')[0] : '');
      
      // Only set dueDate and expirationDate for invoices and quotes, not orders
      if (documentType !== 'bon_livraison') {
        setDueDate(doc.dueDate ? doc.dueDate.split('T')[0] : '');
        setExpirationDate(doc.expirationDate ? doc.expirationDate.split('T')[0] : '');
      } else {
        setDueDate('');
        setExpirationDate('');
      }
      
      setStatus(doc.status || 'draft');
      setIsValidated(doc.isValidated ?? false);
      setNotes(doc.notes || doc.note || '');
      
      // Load payment data for invoices
      if (documentType === 'facture') {
        setPaidAmount(parseFloat(doc.paidAmount?.toString() || '0'));
        setRemainingAmount(parseFloat(doc.remainingAmount?.toString() || '0'));
      }
      
      // Load share token and signature data for devis
      if (documentType === 'devis') {
        setShareToken((doc as any).shareToken || null);
        setShareTokenExpiry((doc as any).shareTokenExpiry ? new Date((doc as any).shareTokenExpiry) : null);
        setSignedBy((doc as any).signedBy || '');
        setSignedDate((doc as any).signedDate ? new Date((doc as any).signedDate) : null);
        setClientNotes((doc as any).clientNotes || '');
      }
      
      // Set partner - fetch full partner details from partnersService
      const customerId = doc.customerId || doc.customer?.id;
      const customerName = doc.customerName || doc.customer?.name;
      const customerPhone = doc.customerPhone || doc.customer?.phone || doc.customer?.phoneNumber;
      const customerAddress = doc.customerAddress || doc.customer?.address;
      
      if (isVente && customerId) {
        try {
          const partnerData = await partnersService.getById(customerId);
          if (partnerData) {
            setPartner(partnerData);
          } else {
            // Fallback to document data if partner not found
            setPartner({
              id: customerId,
              name: customerName || '',
              phoneNumber: customerPhone || '',
              ice: doc.customerIce || null,
              address: customerAddress || null,
              deliveryAddress: '',
              isCompany: false,
              isEnabled: true,
              isCustomer: true,
              isSupplier: false,
              dateCreated: '',
              dateUpdated: ''
            });
          }
        } catch (error) {
          console.error('Error loading partner:', error);
          // Fallback to document data
          setPartner({
            id: customerId,
            name: customerName || '',
            phoneNumber: customerPhone || '',
            ice: doc.customerIce || null,
            address: customerAddress || null,
            deliveryAddress: '',
            isCompany: false,
            isEnabled: true,
            isCustomer: true,
            isSupplier: false,
            dateCreated: '',
            dateUpdated: ''
          });
        }
      } else if (!isVente && doc.supplierId) {
        try {
          const partnerData = await partnersService.getById(doc.supplierId);
          if (partnerData) {
            setPartner(partnerData);
          } else {
            // Fallback to document data if partner not found
            setPartner({
              id: doc.supplierId,
              name: doc.supplierName || '',
              phoneNumber: doc.supplierPhone || '',
              ice: doc.supplierIce || null,
              address: doc.supplierAddress || null,
              deliveryAddress: '',
              isCompany: false,
              isEnabled: true,
              isCustomer: false,
              isSupplier: true,
              dateCreated: '',
              dateUpdated: ''
            });
          }
        } catch (error) {
          console.error('Error loading partner:', error);
          // Fallback to document data
          setPartner({
            id: doc.supplierId,
            name: doc.supplierName || '',
            phoneNumber: doc.supplierPhone || '',
            ice: doc.supplierIce || null,
            address: doc.supplierAddress || null,
            deliveryAddress: '',
            isCompany: false,
            isEnabled: true,
            isCustomer: false,
            isSupplier: true,
            dateCreated: '',
            dateUpdated: ''
          });
        }
      }
      
      // Set items
      const itemsData = documentType === 'bon_livraison' ? doc.items : data.items;
      const mappedItems: DocumentItem[] = (itemsData || []).map((item: any) => ({
        id: String(item.id),
        productId: item.productId,
        description: item.product?.name || item.description || '',
        quantity: parseFloat(item.quantity || 0),
        unitPrice: parseFloat(item.unitPrice || item.price || item.priceBeforeTax || 0),
        discount: parseFloat(item.discount || 0),
        discountType: item.discountType || 0,
        tax: parseFloat(item.tax || item.saleTax || 0),
        total: parseFloat(item.total || 0)
      }));
      setItems(mappedItems);
      
    } catch (error) {
      console.error('Error loading document:', error);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors du chargement du document',
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

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

      // Update document data
      const documentData: any = {
        date,
        dueDate: dueDate || undefined,
        expirationDate: config.features.expirationDate && expirationDate ? expirationDate : undefined,
        customerId: isVente ? partner.id : undefined,
        supplierId: isVente ? undefined : partner.id,
        customerName: isVente ? partner.name : undefined,
        supplierName: isVente ? undefined : partner.name,
        subtotal,
        tax: totalTax,
        discount: 0,
        discountType: 0,
        total,
        notes: notes || undefined,
        items: items.map(item => ({
          id: Number(item.id),
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax || 0,
        }))
      };

      // Call appropriate service based on document type
      if (documentType === 'facture') {
        await invoicesService.update(Number(id), documentData);
      } else if (documentType === 'devis') {
        await quotesService.update(Number(id), documentData);
      } else {
        throw new Error('Les bons de livraison ne peuvent pas être modifiés depuis le back-office');
      }
      
      setAlertMessage({
        title: 'Succès',
        message: `${config.titleShort} mise à jour avec succès`,
        type: 'success'
      });
      setShowAlert(true);
      
      // Reload document to get fresh data
      await loadDocument();
      
    } catch (error: any) {
      console.error('Error updating document:', error);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || `Erreur lors de la mise à jour de la ${config.titleShort.toLowerCase()}`,
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!id) return;
    
    try {
      // Call appropriate service based on document type
      if (documentType === 'facture') {
        await invoicesService.validate(Number(id));
      } else if (documentType === 'devis') {
        await quotesService.validate(Number(id));
      } else if (documentType === 'bon_livraison') {
        await ordersService.validate(Number(id));
      }
      
      setIsValidated(true);
      setShowValidateConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: `${config.titleShort} validée avec succès`,
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error) {
      console.error('Error validating document:', error);
      setShowValidateConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de la validation',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleDevalidate = async () => {
    if (!id) return;
    
    try {
      // Call appropriate service based on document type
      if (documentType === 'facture') {
        await invoicesService.devalidate(Number(id));
      } else if (documentType === 'devis') {
        await quotesService.devalidate(Number(id));
      } else if (documentType === 'bon_livraison') {
        await ordersService.devalidate(Number(id));
      }
      
      setIsValidated(false);
      setShowDevalidateConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: `${config.titleShort} dévalidée avec succès`,
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error) {
      console.error('Error devalidating document:', error);
      setShowDevalidateConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de la dévalidation',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleDeliver = async () => {
    if (!id) return;
    
    try {
      await ordersService.deliver(Number(id));
      setShowDeliverConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: 'Bon de livraison marqué comme livré',
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error) {
      console.error('Error delivering order:', error);
      setShowDeliverConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de la livraison',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleCancel = async () => {
    if (!id) return;
    
    try {
      await ordersService.cancel(Number(id));
      setShowCancelConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: 'Bon de livraison annulé',
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error) {
      console.error('Error canceling order:', error);
      setShowCancelConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: 'Erreur lors de l\'annulation',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleCreateInvoice = async () => {
    setShowCreateInvoiceConfirm(false);
    
    if (!id || !partner) return;
    
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

      // Create invoice data
      const invoiceData = {
        customerId: partner.id,
        customerName: partner.name,
        date,
        dueDate: dueDate || undefined,
        subtotal,
        tax: totalTax,
        discount: 0,
        discountType: 0,
        total,
        notes: notes || undefined,
        items: items.map(item => ({
          productId: item.productId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
          tax: item.tax || 0,
        }))
      };

      // Create the invoice
      const created = await invoicesService.create(invoiceData);
      const createdInvoice = created as any;
      
      // Mark document as converted to invoice based on type
      if (documentType === 'devis') {
        await quotesService.convertToInvoice(Number(id), createdInvoice.invoice.id);
        setAlertMessage({
          title: 'Succès',
          message: 'Facture créée avec succès et devis mis à jour',
          type: 'success'
        });
      } else if (documentType === 'bon_livraison') {
        // Mark order as invoiced
        await ordersService.markAsInvoiced(Number(id), createdInvoice.invoice.id);
        setAlertMessage({
          title: 'Succès',
          message: 'Facture créée avec succès et bon de livraison mis à jour',
          type: 'success'
        });
      }
      
      setShowAlert(true);
      
      // Reload document to get updated status
      await loadDocument();
      
      // Navigate to the invoice edit page after delay
      setTimeout(() => {
        navigate(`/factures/vente/${createdInvoice.invoice.id}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création de la facture',
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBon = async () => {
    setShowCreateBonConfirm(false);
    
    if (!id || !partner) return;
    
    try {
      setSaving(true);
      
      // Create order data
      const orderData = {
        customerId: partner.id,
        items: items.map(item => ({
          productId: item.productId,
          description: item.description || 'Product',
          quantity: item.quantity,
          price: item.unitPrice,
          discount: item.discount || 0,
          discountType: item.discountType || 0,
        })),
        note: notes || '',
      };

      // Create the order
      const created = await ordersService.create(orderData);
      const createdOrder = created as any;
      
      // Mark quote as converted to order
      await quotesService.convertToOrder(Number(id), createdOrder.order.id);
      
      setAlertMessage({
        title: 'Succès',
        message: 'Bon de livraison créé avec succès et devis mis à jour',
        type: 'success'
      });
      setShowAlert(true);
      
      // Update local status
      setStatus('delivered');
      
      // Navigate to the bon edit page after delay
      setTimeout(() => {
        navigate(`/bons-livraison/${createdOrder.order.id}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error creating bon:', error);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la création du bon de livraison',
        type: 'error'
      });
      setShowAlert(true);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateShareLink = async () => {
    if (!id) return;
    
    try {
      const result = await quotesService.generateShareLink(Number(id));
      setShareToken(result.shareToken);
      setShareTokenExpiry(result.expiresAt);
      setAlertMessage({
        title: 'Succès',
        message: 'Lien de partage généré avec succès',
        type: 'success'
      });
      setShowAlert(true);
    } catch (error: any) {
      console.error('Error generating share link:', error);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la génération du lien',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleSignQuote = async () => {
    if (!id) return;
    
    try {
      await quotesService.accept(Number(id));
      setShowSignConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: 'Devis signé avec succès',
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error: any) {
      console.error('Error signing quote:', error);
      setShowSignConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de la signature',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  const handleUnsignQuote = async () => {
    if (!id) return;
    
    try {
      await quotesService.unsignQuote(Number(id));
      setShowUnsignConfirm(false);
      setAlertMessage({
        title: 'Succès',
        message: 'Devis refusé et fermé avec succès',
        type: 'success'
      });
      setShowAlert(true);
      await loadDocument();
    } catch (error: any) {
      console.error('Error unsigning quote:', error);
      setShowUnsignConfirm(false);
      setAlertMessage({
        title: 'Erreur',
        message: error.message || 'Erreur lors de l\'annulation de la signature',
        type: 'error'
      });
      setShowAlert(true);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-500">Chargement...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

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
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-slate-900">
                    {config.titleShort} {invoiceNumber}
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">Modifier la {config.titleShort.toLowerCase()}</p>
                </div>
                {/* Status badges - positioned to the right */}
                <div className="flex items-center gap-3">
                  {/* Validation status badge */}
                  {config.features.hasValidation && (
                    isValidated ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 shadow-sm">
                          <CheckCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-sm text-emerald-700">Validé</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 shadow-sm">
                          <XCircle className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="font-semibold text-sm text-amber-700">Non validé</span>
                      </div>
                    )
                  )}
                  
                  {/* Document status badge - different for each document type */}
                  {documentType === 'facture' && (() => {
                    const statusConfig = getPaymentStatusBadge(status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} border ${statusConfig.border} shadow-sm`}>
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${statusConfig.iconBg} shadow-sm`}>
                          <StatusIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className={`font-semibold text-sm ${statusConfig.textColor}`}>{statusConfig.label}</span>
                      </div>
                    );
                  })()}
                  
                  {documentType === 'devis' && (() => {
                    const statusConfig = getDevisStatusBadge(status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} border ${statusConfig.border} shadow-sm`}>
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${statusConfig.iconBg} shadow-sm`}>
                          <StatusIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className={`font-semibold text-sm ${statusConfig.textColor}`}>{statusConfig.label}</span>
                      </div>
                    );
                  })()}
                  
                  {documentType === 'bon_livraison' && (() => {
                    const statusConfig = getBonStatusBadge(status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${statusConfig.gradient} border ${statusConfig.border} shadow-sm`}>
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full ${statusConfig.iconBg} shadow-sm`}>
                          <StatusIcon className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className={`font-semibold text-sm ${statusConfig.textColor}`}>{statusConfig.label}</span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary Section - Only for validated invoices */}
        {documentType === 'facture' && isValidated && status !== 'draft' && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 shadow-sm">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-bold text-blue-900">Détails de paiement</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Total Amount */}
              <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-sm">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Montant total</p>
                <p className="text-xl font-bold text-slate-900">
                  {items.reduce((sum, item) => sum + (item.total || 0), 0).toFixed(2)} MAD
                </p>
              </div>
              
              {/* Paid Amount */}
              <div className="bg-white rounded-lg p-3 border border-green-100 shadow-sm">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Montant payé</p>
                <p className="text-xl font-bold text-green-600">
                  {paidAmount.toFixed(2)} MAD
                </p>
              </div>
              
              {/* Remaining Amount */}
              <div className="bg-white rounded-lg p-3 border border-orange-100 shadow-sm">
                <p className="text-xs font-medium text-slate-600 mb-0.5">Montant restant</p>
                <p className="text-xl font-bold text-orange-600">
                  {remainingAmount.toFixed(2)} MAD
                </p>
              </div>
            </div>
          </div>
        )}

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
                readOnly={isValidated || (documentType === 'devis' && status === 'closed')}
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                    disabled={isValidated || (documentType === 'devis' && status === 'closed')}
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
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={isValidated || (documentType === 'devis' && status === 'closed')}
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
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100 disabled:text-slate-500"
                      disabled={isValidated}
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
              readOnly={isValidated || (documentType === 'devis' && status === 'closed')}
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
              disabled={isValidated || (documentType === 'devis' && status === 'closed')}
            />
          </div>

          {/* Signature Details and Totals section */}
          <div className="mt-8">
            {documentType === 'devis' ? (
              <div className="flex flex-col md:flex-row gap-6">
                {/* Signature Details - Left Side */}
                <div className="flex-1">
                  {status === 'signed' && signedBy && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h4 className="font-bold text-green-900">Signature</h4>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-green-800">
                          <span className="font-medium">Signé par:</span> {signedBy}
                        </p>
                        {signedDate && (
                          <p className="text-sm text-green-700">
                            <span className="font-medium">Date:</span>{' '}
                            {new Date(signedDate).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        {clientNotes && (
                          <div className="mt-3 pt-3 border-t border-green-200">
                            <p className="text-xs text-green-700 font-medium mb-1">Commentaire:</p>
                            <p className="text-sm text-slate-700">{clientNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Totals - Right Side */}
                <div className="w-full md:w-96">
                  <DocumentTotalsSection items={items} />
                </div>
              </div>
            ) : (
              <DocumentTotalsSection items={items} />
            )}
          </div>
        </div>

        {/* Sticky Bottom Action Bar */}
        <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              {/* Left side - Payment History button for invoices */}
              <div>
                {documentType === 'facture' && isValidated && status !== 'draft' && (
                  <button
                    onClick={() => setShowPaymentHistory(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <History className="w-4 h-4" />
                    <span>Historique des paiements</span>
                  </button>
                )}
              </div>
              
              {/* Right side - Action buttons */}
              <div className="flex items-center gap-3">
              {/* Validation actions */}
              {config.features.hasValidation && (
                isValidated ? (
                  <button
                    onClick={() => setShowDevalidateConfirm(true)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors flex items-center gap-2 font-medium"
                  >
                    <XCircle className="w-4 h-4" />
                    Dévalider
                  </button>
                ) : (
                  <button
                    onClick={() => setShowValidateConfirm(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Valider
                  </button>
                )
              )}
              
              {/* Deliver and Cancel buttons for bon_livraison */}
              {documentType === 'bon_livraison' && status === 'in_progress' && (
                <>
                  <button
                    onClick={() => setShowDeliverConfirm(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <Truck className="w-4 h-4" />
                    Marquer comme livré
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    <Ban className="w-4 h-4" />
                    Annuler
                  </button>
                </>
              )}
              
              {/* Actions menu for bon_livraison */}
              {documentType === 'bon_livraison' && (status === 'delivered' || status === 'in_progress') && (
                <div className="relative" ref={actionsMenuRef}>
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    Actions
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50">
                      {/* Create Invoice from Bon */}
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowCreateInvoiceConfirm(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 rounded-lg"
                      >
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-slate-700">Convertir en facture</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Sign/Unsign buttons for devis */}
              {documentType === 'devis' && isValidated && status !== 'closed' && (
                <>
                  <button
                    onClick={() => setShowSignConfirm(true)}
                    disabled={status === 'signed'}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PenTool className="w-4 h-4" />
                    Signer
                  </button>
                  <button
                    onClick={() => setShowUnsignConfirm(true)}
                    disabled={status !== 'signed'}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2 font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                </>
              )}
              
              {/* Actions menu for devis */}
              {documentType === 'devis' && status === 'signed' && (
                <div className="relative" ref={actionsMenuRef}>
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
                  >
                    Actions
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-xl border border-slate-200 z-50 divide-y divide-slate-100">
                      {/* Share Quote */}
                      {isValidated && (
                        <button
                          onClick={() => {
                            setShowActionsMenu(false);
                            setShowShareDialog(true);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 rounded-t-lg"
                        >
                          <Share2 className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-slate-700">Partager avec client</span>
                        </button>
                      )}
                      
                      {/* Create Invoice */}
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowCreateInvoiceConfirm(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3"
                      >
                        <FileText className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-medium text-slate-700">Créer une facture</span>
                      </button>
                      
                      {/* Create Bon de Livraison */}
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowCreateBonConfirm(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 rounded-b-lg"
                      >
                        <Truck className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-slate-700">Créer un bon de livraison</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Save button */}
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2 font-medium shadow-sm"
                disabled={saving || isValidated || (documentType === 'devis' && status === 'closed')}
              >
                <Save className="w-4 h-4" />
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {config.features.hasValidation && (
        <>
          <ConfirmDialog
            isOpen={showValidateConfirm}
            onClose={() => setShowValidateConfirm(false)}
            onConfirm={handleValidate}
            title="Valider le document"
            message="Êtes-vous sûr de vouloir valider ce document ? Il ne pourra plus être modifié."
            type="warning"
            confirmText="Valider"
            cancelText="Annuler"
          />

          <ConfirmDialog
            isOpen={showDevalidateConfirm}
            onClose={() => setShowDevalidateConfirm(false)}
            onConfirm={handleDevalidate}
            title="Dévalider le document"
            message="Êtes-vous sûr de vouloir dévalider ce document ?"
            type="warning"
            confirmText="Dévalider"
            cancelText="Annuler"
          />
        </>
      )}

      {(documentType === 'devis' || documentType === 'bon_livraison') && (
        <ConfirmDialog
          isOpen={showCreateInvoiceConfirm}
          onClose={() => setShowCreateInvoiceConfirm(false)}
          onConfirm={handleCreateInvoice}
          title="Créer une facture"
          message={`Voulez-vous créer une facture à partir de ${documentType === 'devis' ? 'ce devis' : 'ce bon de livraison'} ? Toutes les données seront copiées.`}
          type="info"
          confirmText="Créer"
          cancelText="Annuler"
        />
      )}

      {documentType === 'devis' && (
        <>
          <ConfirmDialog
            isOpen={showCreateBonConfirm}
            onClose={() => setShowCreateBonConfirm(false)}
            onConfirm={handleCreateBon}
            title="Créer un bon de livraison"
            message="Voulez-vous créer un bon de livraison à partir de ce devis ? Toutes les données seront copiées."
            type="info"
            confirmText="Créer"
            cancelText="Annuler"
          />

          <ConfirmDialog
            isOpen={showSignConfirm}
            onClose={() => setShowSignConfirm(false)}
            onConfirm={handleSignQuote}
            title="Signer le devis"
            message="Voulez-vous marquer ce devis comme signé ?"
            type="info"
            confirmText="Signer"
            cancelText="Annuler"
          />

          <ConfirmDialog
            isOpen={showUnsignConfirm}
            onClose={() => setShowUnsignConfirm(false)}
            onConfirm={handleUnsignQuote}
            title="Refuser le devis"
            message="Voulez-vous vraiment refuser ce devis ? Le statut sera changé à 'Fermé'."
            type="warning"
            confirmText="Refuser"
            cancelText="Non"
          />
        </>
      )}

      {documentType === 'devis' && (
        <ShareQuoteDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          quoteNumber={invoiceNumber}
          shareToken={shareToken}
          expiresAt={shareTokenExpiry}
          onGenerateLink={handleGenerateShareLink}
        />
      )}

      {documentType === 'bon_livraison' && (
        <>
          <ConfirmDialog
            isOpen={showDeliverConfirm}
            onClose={() => setShowDeliverConfirm(false)}
            onConfirm={handleDeliver}
            title="Marquer comme livré"
            message="Êtes-vous sûr de vouloir marquer ce bon de livraison comme livré ?"
            type="info"
            confirmText="Livrer"
            cancelText="Annuler"
          />

          <ConfirmDialog
            isOpen={showCancelConfirm}
            onClose={() => setShowCancelConfirm(false)}
            onConfirm={handleCancel}
            title="Annuler le bon de livraison"
            message="Êtes-vous sûr de vouloir annuler ce bon de livraison ? Cette action peut être irréversible."
            type="warning"
            confirmText="Annuler le bon"
            cancelText="Non"
          />
        </>
      )}

      <AlertDialog
        isOpen={showAlert}
        onClose={() => setShowAlert(false)}
        title={alertMessage.title}
        message={alertMessage.message}
        type={alertMessage.type}
      />

      {documentType === 'facture' && (
        <PaymentHistoryModal
          isOpen={showPaymentHistory}
          onClose={() => setShowPaymentHistory(false)}
          invoiceId={Number(id)}
          invoiceNumber={invoiceNumber}
          invoiceTotal={items.reduce((sum, item) => sum + (item.total || 0), 0)}
          customerId={partner?.id}
          onPaymentUpdate={loadDocument}
        />
      )}
    </AdminLayout>
  );
}
