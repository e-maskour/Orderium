import { AdminLayout } from '../../components/AdminLayout';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useDocumentCalculation } from '../../modules/documents/hooks';
import { Save, X, CheckCircle, XCircle, ChevronDown, FileText, Truck, ArrowLeft, DollarSign, Clock, AlertCircle, Share2, PenTool, Ban, Receipt, History } from 'lucide-react';
import { DocumentType, DocumentDirection, DocumentConfig, DocumentItem } from '../../modules/documents/types';
import { Partner, IPartner, partnersService } from '../../modules/partners';
import { DocumentPartnerBox, DocumentItemsTable, DocumentTotalsSection } from '../../components/documents';
import { ShareQuoteDialog } from '../../components/documents/ShareQuoteDialog';
import { invoicesService } from '../../modules/invoices/invoices.service';
import type { CreateInvoiceDTO } from '../../modules/invoices/invoices.interface';
import { quotesService } from '../../modules/quotes/quotes.service';
import { ordersService } from '../../modules/orders/orders.service';
import PDFActionButtons from '../../components/PDFActionButtons';
import { pdfService } from '../../services/pdf.service';
import { toastSuccess, toastError, toastValidated, toastDevalidated, toastDelivered, toastCancelled, toastDocument, toastLinked, toastConfirm } from '../../services/toast.service';
import PaymentHistoryModal from '../../components/PaymentHistoryModal';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { Calendar } from 'primereact/calendar';
import { formatAmount } from '@orderium/ui';

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
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareTokenExpiry, setShareTokenExpiry] = useState<Date | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Document state
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [validationDate, setValidationDate] = useState('');
  const [partner, setPartner] = useState<IPartner | null>(null);
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

  const totalTTC = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 1
      ? itemTotal * (item.discount / 100)
      : item.discount;
    const afterDiscount = itemTotal - discountAmount;
    const tax = afterDiscount * (item.tax / 100);
    return sum + afterDiscount + tax;
  }, 0);

  // Helper function to get payment status badge configuration
  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircle,
          label: t('statusPaid'),
          gradient: 'linear-gradient(to right, #f0fdf4, #ecfdf5)',
          borderColor: '#bbf7d0',
          iconBgColor: '#22c55e',
          textColor: '#15803d'
        };
      case 'partial':
        return {
          icon: Clock,
          label: t('statusPartial'),
          gradient: 'linear-gradient(to right, #eff6ff, #ecfeff)',
          borderColor: '#bfdbfe',
          iconBgColor: '#3b82f6',
          textColor: '#1d4ed8'
        };
      case 'unpaid':
        return {
          icon: AlertCircle,
          label: t('statusUnpaid'),
          gradient: 'linear-gradient(to right, #fef2f2, #fff1f2)',
          borderColor: '#fecaca',
          iconBgColor: '#ef4444',
          textColor: '#b91c1c'
        };
      default: // draft
        return {
          icon: FileText,
          label: t('statusDraft'),
          gradient: 'linear-gradient(to right, #f8fafc, #f9fafb)',
          borderColor: '#cbd5e1',
          iconBgColor: '#64748b',
          textColor: '#334155'
        };
    }
  };

  // Helper function to get devis status badge configuration
  const getDevisStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return {
          icon: FileText,
          label: t('statusOpen'),
          gradient: 'linear-gradient(to right, #eff6ff, #f0f9ff)',
          borderColor: '#bfdbfe',
          iconBgColor: '#3b82f6',
          textColor: '#1d4ed8'
        };
      case 'signed':
        return {
          icon: CheckCircle,
          label: t('statusSigned'),
          gradient: 'linear-gradient(to right, #f0fdf4, #ecfdf5)',
          borderColor: '#bbf7d0',
          iconBgColor: '#22c55e',
          textColor: '#15803d'
        };
      case 'closed':
        return {
          icon: XCircle,
          label: t('statusClosed'),
          gradient: 'linear-gradient(to right, #fef2f2, #fff1f2)',
          borderColor: '#fecaca',
          iconBgColor: '#ef4444',
          textColor: '#b91c1c'
        };
      case 'delivered':
        return {
          icon: Truck,
          label: t('statusDelivered'),
          gradient: 'linear-gradient(to right, #fff7ed, #fffbeb)',
          borderColor: '#fed7aa',
          iconBgColor: '#f97316',
          textColor: '#c2410c'
        };
      case 'invoiced':
        return {
          icon: DollarSign,
          label: t('statusInvoiced'),
          gradient: 'linear-gradient(to right, #faf5ff, #f5f3ff)',
          borderColor: '#e9d5ff',
          iconBgColor: '#a855f7',
          textColor: '#7e22ce'
        };
      default: // draft
        return {
          icon: FileText,
          label: t('statusDraft'),
          gradient: 'linear-gradient(to right, #f8fafc, #f9fafb)',
          borderColor: '#cbd5e1',
          iconBgColor: '#64748b',
          textColor: '#334155'
        };
    }
  };

  // Helper function to get bon de livraison status badge configuration
  const getBonStatusBadge = (status: string) => {
    switch (status) {
      case 'validated':
        return {
          icon: CheckCircle,
          label: t('statusValidated'),
          gradient: 'linear-gradient(to right, #f0f9ff, #eff6ff)',
          borderColor: '#bae6fd',
          iconBgColor: '#0ea5e9',
          textColor: '#0369a1'
        };
      case 'in_progress':
        return {
          icon: Truck,
          label: t('statusInProgress'),
          gradient: 'linear-gradient(to right, #ecfeff, #f0fdfa)',
          borderColor: '#a5f3fc',
          iconBgColor: '#06b6d4',
          textColor: '#0e7490'
        };
      case 'delivered':
        return {
          icon: Truck,
          label: t('statusDeliveredBon'),
          gradient: 'linear-gradient(to right, #f0fdfa, #ecfdf5)',
          borderColor: '#99f6e4',
          iconBgColor: '#14b8a6',
          textColor: '#0f766e'
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: t('statusCancelled'),
          gradient: 'linear-gradient(to right, #fff1f2, #fef2f2)',
          borderColor: '#fecdd3',
          iconBgColor: '#f43f5e',
          textColor: '#be123c'
        };
      case 'invoiced':
        return {
          icon: DollarSign,
          label: t('statusInvoicedBon'),
          gradient: 'linear-gradient(to right, #faf5ff, #f5f3ff)',
          borderColor: '#e9d5ff',
          iconBgColor: '#a855f7',
          textColor: '#7e22ce'
        };
      default: // draft
        return {
          icon: FileText,
          label: t('statusDraft'),
          gradient: 'linear-gradient(to right, #f8fafc, #f9fafb)',
          borderColor: '#cbd5e1',
          iconBgColor: '#64748b',
          textColor: '#334155'
        };
    }
  };

  // Map document type to PDF service type
  const getPDFDocumentType = (docType: DocumentType): 'invoice' | 'quote' | 'delivery-note' => {
    switch (docType) {
      case 'facture':
        return 'invoice';
      case 'devis':
        return 'quote';
      case 'bon_livraison':
        return 'delivery-note';
      default:
        return 'invoice';
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

      // Set dueDate and expirationDate for all document types
      setDueDate(doc.dueDate ? doc.dueDate.split('T')[0] : '');
      if (documentType !== 'bon_livraison') {
        setExpirationDate(doc.expirationDate ? doc.expirationDate.split('T')[0] : '');
      } else {
        setExpirationDate('');
      }

      setStatus(doc.status || 'draft');
      setIsValidated(doc.isValidated ?? false);
      setValidationDate(doc.validationDate ? doc.validationDate.split('T')[0] : '');
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
      toastError(t('errorLoadingDocument'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;

    // Validation
    if (!partner) {
      toastError(`${t('selectPartner')} ${config.partnerLabel.toLowerCase()}`);
      return;
    }

    if (items.length === 0) {
      toastError(t('pleaseAddAtLeastOneItem'));
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
            id: item.id.startsWith('new_') ? undefined : Number(item.id),
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
      if (documentType === 'facture') {
        await invoicesService.update(Number(id), documentData);
      } else if (documentType === 'devis') {
        await quotesService.update(Number(id), documentData);
      } else if (documentType === 'bon_livraison') {
        await ordersService.update(Number(id), documentData);
      }

      toastSuccess(`${config.titleShort} ${t('successUpdated')}`);

      // Reload document to get fresh data
      await loadDocument();

    } catch (error: any) {
      console.error('Error updating document:', error);
      toastError(error.message || `${t('error')} lors de la mise à jour de la ${config.titleShort.toLowerCase()}`);
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
      toastValidated(`${config.titleShort} ${t('successValidated')}`);
      await loadDocument();
    } catch (error) {
      console.error('Error validating document:', error);
      toastError(t('errorValidating'));
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
      toastDevalidated(`${config.titleShort} ${t('successDevalidated')}`);
      await loadDocument();
    } catch (error) {
      console.error('Error devalidating document:', error);
      toastError(t('errorDevalidating'));
    }
  };

  const handleDeliver = async () => {
    if (!id) return;

    try {
      await ordersService.deliver(Number(id));
      toastDelivered(t('successDelivered'));
      await loadDocument();
    } catch (error) {
      console.error('Error delivering order:', error);
      toastError(t('errorDelivering'));
    }
  };

  const handleCancel = async () => {
    if (!id) return;

    try {
      await ordersService.cancel(Number(id));
      toastCancelled(t('successCancelled'));
      await loadDocument();
    } catch (error) {
      console.error('Error canceling order:', error);
      toastError(t('errorCancelling'));
    }
  };

  const handleCreateInvoice = async () => {
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

      const isVente = direction === 'vente';

      // Create invoice data
      const invoiceData: CreateInvoiceDTO = {
        direction: direction === 'achat' ? 'ACHAT' : 'VENTE',
        customerId: isVente ? partner.id : undefined,
        supplierId: isVente ? undefined : partner.id,
        customerName: isVente ? partner.name : undefined,
        supplierName: isVente ? undefined : partner.name,
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
      const createdInvoiceId = created.invoice.id;

      // Mark document as converted to invoice based on type
      if (documentType === 'devis') {
        await quotesService.convertToInvoice(Number(id), createdInvoiceId);
        toastDocument(t('successInvoiceCreatedQuoteUpdated'));
      } else if (documentType === 'bon_livraison') {
        // Mark order as invoiced
        await ordersService.markAsInvoiced(Number(id), createdInvoiceId);
        toastDocument(t('successInvoiceCreatedDeliveryUpdated'));
      }

      // Reload document to get updated status
      await loadDocument();

      // Navigate to the invoice edit page after delay
      setTimeout(() => {
        navigate(`/factures/${direction}/${createdInvoiceId}`);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toastError(error.message || t('errorCreatingInvoice'));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBon = async () => {

    if (!id || !partner) return;

    try {
      setSaving(true);

      const isVente = direction === 'vente';

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

      // Create order data with all totals
      const orderData = {
        customerId: isVente ? partner.id : undefined,
        customerName: isVente ? partner.name : undefined,
        customerPhone: isVente ? partner.phoneNumber : undefined,
        customerAddress: isVente ? partner.address : undefined,
        supplierId: isVente ? undefined : partner.id,
        supplierName: isVente ? undefined : partner.name,
        supplierPhone: isVente ? undefined : partner.phoneNumber,
        supplierAddress: isVente ? undefined : partner.address,
        date,
        dueDate: dueDate || undefined,
        subtotal,
        tax: totalTax,
        discount: 0,
        discountType: 0,
        total,
        items: items.map(item => {
          // Calculate item total (HT: before tax)
          const itemSubtotal = item.quantity * item.unitPrice;
          const discountAmount = item.discountType === 1
            ? itemSubtotal * (item.discount / 100)
            : item.discount;
          const itemTotal = itemSubtotal - discountAmount;

          return {
            productId: item.productId,
            description: item.description || 'Product',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            price: item.unitPrice,
            discount: item.discount || 0,
            discountType: item.discountType || 0,
            tax: item.tax || 0,
            total: itemTotal
          };
        }),
        note: notes || '',
      };

      // Create the order
      const created = await ordersService.create(orderData);

      // Mark quote as converted to order
      await quotesService.convertToOrder(Number(id), created.id);

      toastDocument(t('successDeliveryCreatedQuoteUpdated'));

      // Update local status
      setStatus('delivered');

      // Navigate to the bon edit page after delay
      setTimeout(() => {
        const bonRoute = direction === 'vente'
          ? `/bons-livraison/${created.id}`
          : `/bon-achat/${created.id}`;
        navigate(bonRoute);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating bon:', error);
      toastError(error.message || t('errorCreatingDeliveryNote'));
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
      toastSuccess(t('successLinkGenerated'));
    } catch (error: any) {
      console.error('Error generating share link:', error);
      toastError(error.message || t('errorGeneratingLink'));
    }
  };

  const handleSignQuote = async () => {
    if (!id) return;

    try {
      await quotesService.accept(Number(id));
      toastSuccess(t('successQuoteSigned'));
      await loadDocument();
    } catch (error: any) {
      console.error('Error signing quote:', error);
      toastError(error.message || t('errorSigning'));
    }
  };

  const handleUnsignQuote = async () => {
    if (!id) return;

    try {
      await quotesService.unsignQuote(Number(id));
      toastSuccess(t('successQuoteRejected'));
      await loadDocument();
    } catch (error: any) {
      console.error('Error unsigning quote:', error);
      toastError(error.message || t('errorUnsigning'));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '20rem', gap: '1rem' }}>
            <div style={{
              width: '3rem', height: '3rem',
              background: 'linear-gradient(135deg, #235ae4, #1a47b8)',
              borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(35,90,228,0.3)',
              animation: 'pulse 1.5s ease-in-out infinite'
            }}>
              {(() => { const DocIcon = config.icon; return <DocIcon style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} />; })()}
            </div>
            <p style={{ color: '#64748b', fontWeight: 500, fontSize: '0.9375rem' }}>{t('loading')}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style>{`
        .doc-edit-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 1.5rem; }
        .doc-sticky-bar { position: fixed; bottom: 0; left: 16rem; right: 0; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-top: 1.5px solid #e2e8f0; box-shadow: 0 -4px 20px rgba(0,0,0,0.08); z-index: 40; }
        .doc-field-label { display: block; font-size: 0.6875rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.375rem; }
        .doc-cal { position: relative !important; display: block !important; }
        .doc-cal .p-inputtext { padding-right: 2.5rem !important; width: 100% !important; border-top-right-radius: var(--orderium-radius-md, 6px) !important; border-bottom-right-radius: var(--orderium-radius-md, 6px) !important; }
        .doc-cal .p-datepicker-trigger { position: absolute !important; right: 0 !important; top: 0 !important; bottom: 0 !important; height: 100% !important; background: transparent !important; border: none !important; color: #94a3b8 !important; box-shadow: none !important; padding: 0 0.5rem !important; }
        .doc-cal .p-datepicker-trigger:hover { color: var(--form-input-border-focus) !important; background: transparent !important; }
        .doc-notes-totals { display: grid; grid-template-columns: 3fr 2fr; gap: 1.5rem; margin-top: 1.5rem; align-items: flex-start; }
        @media (max-width: 768px) { .doc-edit-grid { grid-template-columns: 1fr !important; } .doc-sticky-bar { left: 0 !important; } .doc-notes-totals { grid-template-columns: 1fr !important; gap: 1rem !important; } }
        /* ── Document detail header – responsive ── */
        .doc-detail-hdr { display: flex; align-items: center; gap: 0.875rem; flex-wrap: nowrap; position: relative; margin-bottom: 1.5rem; padding: 0.75rem 1.25rem; background: rgba(255,255,255,0.72); backdrop-filter: blur(8px); border-radius: 1rem; border: 1px solid rgba(226,232,240,0.6); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04); overflow: hidden; }
        .doc-detail-hdr__icon { width: 3rem; height: 3rem; flex-shrink: 0; background: linear-gradient(135deg, #235ae4 0%, #818cf8 100%); border-radius: 0.875rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(35,90,228,0.35); }
        .doc-detail-hdr__body { flex: 1; min-width: 0; overflow: hidden; }
        .doc-detail-hdr__crumb { display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.2rem; }
        .doc-detail-hdr__title { margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .doc-detail-hdr__badges { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; flex-wrap: wrap; justify-content: flex-end; }
        @media (max-width: 599px) {
          .doc-detail-hdr { padding: 0.625rem 0.75rem; gap: 0.5rem; border-radius: 0.875rem; margin-bottom: 0.75rem; flex-wrap: wrap; }
          .doc-detail-hdr__icon { display: none !important; }
          .doc-detail-hdr__title { display: none !important; }
          .doc-detail-hdr__crumb { margin-bottom: 0; }
          .doc-detail-hdr__badges { flex-wrap: nowrap; overflow-x: auto; justify-content: flex-start; -webkit-overflow-scrolling: touch; scrollbar-width: none; gap: 0.4375rem; width: 100%; }
          .doc-detail-hdr__badges::-webkit-scrollbar { display: none; }
        }
      `}</style>
      <div style={{ maxWidth: '1600px', margin: '0 auto', paddingBottom: '6rem' }}>
        {/* ── Page Header ── */}
        <div className="doc-detail-hdr">
          {/* Back button */}
          <Button
            icon={<ArrowLeft style={{ width: '1rem', height: '1rem' }} />}
            onClick={() => navigate(listRoute)}
            style={{ width: '2.25rem', height: '2.25rem', flexShrink: 0, background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#64748b', borderRadius: '0.625rem', padding: 0 }}
          />
          {/* Desktop only: document icon */}
          <div className="doc-detail-hdr__icon">
            {(() => { const DocIcon = config.icon; return <DocIcon style={{ width: '1.5rem', height: '1.5rem', color: '#fff' }} />; })()}
          </div>
          {/* Title + breadcrumb */}
          <div className="doc-detail-hdr__body">
            <div className="doc-detail-hdr__crumb">
              <span
                onClick={() => navigate(listRoute)}
                style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', cursor: 'pointer' }}
              >{config.titleShort}</span>
              <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>›</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#235ae4', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{invoiceNumber}</span>
            </div>
            <h1 className="doc-detail-hdr__title">
              <span style={{ color: '#235ae4' }}>{invoiceNumber}</span>
            </h1>
          </div>
          {/* Status badges */}
          <div className="doc-detail-hdr__badges">
            {config.features.hasValidation && (
              isValidated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)', border: '1.5px solid #a7f3d0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <CheckCircle style={{ width: '0.875rem', height: '0.875rem', color: '#10b981', flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('validated')}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', background: 'linear-gradient(135deg, #fffbeb, #fff7ed)', border: '1.5px solid #fcd34d', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <Clock style={{ width: '0.875rem', height: '0.875rem', color: '#f59e0b', flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('notValidated')}</span>
                </div>
              )
            )}
            {documentType === 'facture' && (() => {
              const statusConfig = getPaymentStatusBadge(status);
              const StatusIcon = statusConfig.icon;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', background: statusConfig.gradient, border: `1.5px solid ${statusConfig.borderColor}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <StatusIcon style={{ width: '0.875rem', height: '0.875rem', color: statusConfig.textColor, flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: statusConfig.textColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusConfig.label}</span>
                </div>
              );
            })()}
            {documentType === 'devis' && (() => {
              const statusConfig = getDevisStatusBadge(status);
              const StatusIcon = statusConfig.icon;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', background: statusConfig.gradient, border: `1.5px solid ${statusConfig.borderColor}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <StatusIcon style={{ width: '0.875rem', height: '0.875rem', color: statusConfig.textColor, flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: statusConfig.textColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusConfig.label}</span>
                </div>
              );
            })()}
            {documentType === 'bon_livraison' && (() => {
              const statusConfig = getBonStatusBadge(status);
              const StatusIcon = statusConfig.icon;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4375rem', padding: '0.4375rem 0.875rem', borderRadius: '9999px', background: statusConfig.gradient, border: `1.5px solid ${statusConfig.borderColor}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  <StatusIcon style={{ width: '0.875rem', height: '0.875rem', color: statusConfig.textColor, flexShrink: 0 }} strokeWidth={2.5} />
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: statusConfig.textColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{statusConfig.label}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* ── Payment Summary – validated invoices only ── */}
        {documentType === 'facture' && isValidated && status !== 'draft' && (
          <div style={{ borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1.5px solid #bfdbfe', marginBottom: '1.5rem' }}>
            <div style={{
              padding: '0.75rem 1.25rem',
              background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
              borderBottom: '1.5px solid #bfdbfe',
              display: 'flex', alignItems: 'center', gap: '0.625rem'
            }}>
              <div style={{ width: '1.75rem', height: '1.75rem', background: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Receipt style={{ width: '1rem', height: '1rem', color: '#ffffff' }} />
              </div>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e40af' }}>{t('paymentDetails')}</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: 'linear-gradient(to right, #eff6ff, #eef2ff)' }}>
              <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid #dbeafe' }}>
                <p style={{ margin: '0 0 0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('totalAmount')}</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {formatAmount(totalTTC, 2)} <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                </p>
              </div>
              <div style={{ padding: '1rem 1.25rem', borderRight: '1px solid #dcfce7', background: 'linear-gradient(135deg, rgba(240,253,244,0.7), rgba(236,253,245,0.7))' }}>
                <p style={{ margin: '0 0 0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('paidAmount')}</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#15803d', letterSpacing: '-0.01em' }}>
                  {formatAmount(paidAmount, 2)} <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: 600 }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                </p>
              </div>
              <div style={{ padding: '1rem 1.25rem', background: remainingAmount > 0 ? 'linear-gradient(135deg, rgba(255,237,213,0.7), rgba(254,242,242,0.7))' : 'transparent' }}>
                <p style={{ margin: '0 0 0.375rem', fontSize: '0.6875rem', fontWeight: 700, color: remainingAmount > 0 ? '#ea580c' : '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('remainingAmount')}</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: remainingAmount > 0 ? '#c2410c' : '#16a34a', letterSpacing: '-0.01em' }}>
                  {formatAmount(remainingAmount, 2)} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{language === 'ar' ? 'د.م' : 'DH'}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        <div style={{ backgroundColor: '#ffffff', borderRadius: '1rem', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1.5px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Top accent bar */}
          <div style={{ height: '3px', background: 'linear-gradient(to right, #235ae4, #1a47b8)' }} />
          <div style={{ padding: '1.5rem' }}>
            {/* Two column layout: Partner on left, Document info on right */}
            <div className="doc-edit-grid">
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
                  readOnly={isValidated || (documentType === 'devis' && status === 'closed')}
                />
              </div>

              {/* Document information - Right */}
              <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ padding: '0.875rem 1.125rem', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
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
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>{t('documentInformation')}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                      {documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')}
                    </p>
                  </div>
                </div>
                <div style={{ padding: '1rem 1.125rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                  <div>
                    <label className="doc-field-label">{documentType === 'facture' ? t('dateDeFacturation') : documentType === 'bon_livraison' ? t('dateDeBon') : t('dateDeDevis')}</label>
                    <Calendar
                      value={date ? new Date(date) : null}
                      onChange={(e) => setDate(e.value ? (e.value as Date).toISOString().split('T')[0] : '')}
                      readOnlyInput={isValidated || (documentType === 'devis' && status === 'closed')}
                      disabled={false}
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
                        readOnlyInput={isValidated || (documentType === 'devis' && status === 'closed')}
                        disabled={false}
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
                      readOnlyInput={isValidated || (documentType === 'devis' && status === 'closed')}
                      disabled={false}
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
              readOnly={isValidated || (documentType === 'devis' && status === 'closed')}
            />

            {/* Notes + Totals Row */}
            <div className="doc-notes-totals">
              {/* Notes - 60% */}
              <div style={{ minWidth: 0 }}>
                <div style={{ backgroundColor: '#ffffff', borderRadius: '0.875rem', border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <div style={{ padding: '0.75rem 1.125rem', background: 'linear-gradient(to right, #f8fafc, #eff6ff)', borderBottom: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '0.25rem', height: '1.25rem', background: 'linear-gradient(to bottom, #235ae4, #1a47b8)', borderRadius: '2px', flexShrink: 0 }} />
                    <FileText style={{ width: '0.9375rem', height: '0.9375rem', color: '#3b82f6', flexShrink: 0 }} />
                    <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#1e293b' }}>{t('notes')}</h3>
                  </div>
                  <div style={{ padding: '1rem 1.125rem' }}>
                    <InputTextarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={t('additionalNotes')}
                      disabled={isValidated || (documentType === 'devis' && status === 'closed')}
                      style={{ width: '100%', resize: 'vertical', minHeight: '7rem' }}
                    />
                  </div>
                </div>

                {/* Signature card (devis only) */}
                {documentType === 'devis' && status === 'signed' && signedBy && (
                  <div style={{ marginTop: '1rem', backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.875rem', overflow: 'hidden', boxShadow: '0 2px 10px rgba(22,163,74,0.1)' }}>
                    <div style={{ padding: '0.625rem 1rem', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderBottom: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle style={{ width: '1rem', height: '1rem', color: '#16a34a' }} /><h4 style={{ margin: 0, fontWeight: 700, color: '#14532d', fontSize: '0.875rem' }}>{t('signature')}</h4></div>
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <p style={{ fontSize: '0.875rem', color: '#166534' }}><span style={{ fontWeight: 500 }}>{t('signedBy')}</span> {signedBy}</p>
                        {signedDate && (
                          <p style={{ fontSize: '0.875rem', color: '#15803d' }}>
                            <span style={{ fontWeight: 500 }}>{t('dateLabel')}</span>{' '}
                            {new Date(signedDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {clientNotes && (
                          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #bbf7d0' }}>
                            <p style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: 500, marginBottom: '0.25rem' }}>{t('comment')}</p>
                            <p style={{ fontSize: '0.875rem', color: '#334155' }}>{clientNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals - 40% */}
              <div style={{ minWidth: 0 }}>
                <DocumentTotalsSection items={items} />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="doc-sticky-bar">
            <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0.75rem 1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left side - Payment History button for invoices */}
                <div>
                  {documentType === 'facture' && isValidated && status !== 'draft' && (
                    <Button
                      icon={<History style={{ width: '1rem', height: '1rem' }} />}
                      label={t('paymentHistory')}
                      onClick={() => setShowPaymentHistory(true)}
                      severity="info"
                    />
                  )}
                </div>

                {/* Right side - Action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Validation actions */}
                  {config.features.hasValidation && (
                    isValidated ? (
                      <Button
                        icon={<XCircle style={{ width: '1rem', height: '1rem' }} />}
                        label={t('devalidateDocument')}
                        onClick={() => toastConfirm(t('confirmDevalidateDocument'), handleDevalidate, { confirmLabel: t('devalidateDocument') })}
                        severity="secondary"
                      />
                    ) : (
                      <Button
                        icon={<CheckCircle style={{ width: '1rem', height: '1rem' }} />}
                        label={t('validateDocument')}
                        onClick={() => toastConfirm(t('confirmValidateDocument'), handleValidate, { confirmLabel: t('validateDocument') })}
                        severity="success"
                      />
                    )
                  )}

                  {/* Deliver and Cancel buttons for bon_livraison */}
                  {documentType === 'bon_livraison' && status === 'in_progress' && (
                    <>
                      <Button
                        icon={<Truck style={{ width: '1rem', height: '1rem' }} />}
                        label={t('markAsDelivered')}
                        onClick={() => toastConfirm(t('confirmMarkDelivered'), handleDeliver, { confirmLabel: t('deliverButton') })}
                        severity="info"
                      />
                      <Button
                        icon={<Ban style={{ width: '1rem', height: '1rem' }} />}
                        label={t('cancel')}
                        onClick={() => toastConfirm(t('confirmCancelDelivery'), handleCancel, { confirmLabel: t('cancelDeliveryButton') })}
                        severity="danger"
                      />
                    </>
                  )}

                  {/* Actions menu for bon_livraison */}
                  {documentType === 'bon_livraison' && (status === 'delivered' || status === 'in_progress') && (
                    <div style={{ position: 'relative' }} ref={actionsMenuRef}>
                      <Button
                        icon={<ChevronDown style={{ width: '1rem', height: '1rem' }} />}
                        iconPos="right"
                        label={t('actions')}
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        style={{ backgroundColor: '#235ae4', borderColor: '#235ae4' }}
                      />
                      {showActionsMenu && (
                        <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', width: '14rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', zIndex: 50 }}>
                          {/* Create Invoice from Bon */}
                          <Button
                            onClick={() => {
                              setShowActionsMenu(false);
                              toastConfirm(`${t('createInvoiceMessage')} ${t('thisDeliveryNote')}${t('allDataWillBeCopied')}`, handleCreateInvoice, { confirmLabel: t('create') });
                            }}
                            icon={<FileText style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />}
                            iconPos="left"
                            label={t('convertToInvoice')}
                            text
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', fontWeight: 500, color: '#334155', borderRadius: '0.5rem' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sign/Unsign buttons for devis */}
                  {documentType === 'devis' && isValidated && status !== 'closed' && (
                    <>
                      <Button
                        icon={<PenTool style={{ width: '1rem', height: '1rem' }} />}
                        label={t('signQuote')}
                        onClick={() => toastConfirm(t('confirmSignQuote'), handleSignQuote, { confirmLabel: t('signQuote') })}
                        disabled={status === 'signed'}
                        severity="success"
                      />
                      <Button
                        icon={<XCircle style={{ width: '1rem', height: '1rem' }} />}
                        label={t('rejectQuote')}
                        onClick={() => toastConfirm(t('confirmRejectQuote'), handleUnsignQuote, { confirmLabel: t('rejectButton') })}
                        disabled={status !== 'signed'}
                        severity="warning"
                      />
                    </>
                  )}

                  {/* Actions menu for devis */}
                  {documentType === 'devis' && status === 'signed' && (
                    <div style={{ position: 'relative' }} ref={actionsMenuRef}>
                      <Button
                        icon={<ChevronDown style={{ width: '1rem', height: '1rem' }} />}
                        iconPos="right"
                        label={t('actions')}
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        severity="info"
                      />
                      {showActionsMenu && (
                        <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: '0.5rem', width: '14rem', backgroundColor: '#ffffff', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0', zIndex: 50 }}>
                          {/* Share Quote */}
                          {isValidated && (
                            <Button
                              onClick={() => {
                                setShowActionsMenu(false);
                                setShowShareDialog(true);
                              }}
                              icon={<Share2 style={{ width: '1rem', height: '1rem', color: '#2563eb' }} />}
                              iconPos="left"
                              label={t('shareWithClient')}
                              text
                              style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', fontWeight: 500, color: '#334155', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }}
                            />
                          )}

                          {/* Create Invoice */}
                          <Button
                            onClick={() => {
                              setShowActionsMenu(false);
                              toastConfirm(`${t('createInvoiceMessage')} ${t('thisQuote')}${t('allDataWillBeCopied')}`, handleCreateInvoice, { confirmLabel: t('create') });
                            }}
                            icon={<FileText style={{ width: '1rem', height: '1rem', color: '#235ae4' }} />}
                            iconPos="left"
                            label={t('createAnInvoice')}
                            text
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', fontWeight: 500, color: '#334155', borderTop: '1px solid #f1f5f9' }}
                          />

                          {/* Create Bon de Livraison */}
                          <Button
                            onClick={() => {
                              setShowActionsMenu(false);
                              toastConfirm(t('confirmCreateDeliveryNote'), handleCreateBon, { confirmLabel: t('create') });
                            }}
                            icon={<Truck style={{ width: '1rem', height: '1rem', color: '#059669' }} />}
                            iconPos="left"
                            label={t('createDeliveryNote')}
                            text
                            style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', fontWeight: 500, color: '#334155', borderBottomLeftRadius: '0.5rem', borderBottomRightRadius: '0.5rem', borderTop: '1px solid #f1f5f9' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF Action Buttons - Show when validated and not draft */}
                  {isValidated && status !== 'draft' && id && (
                    <PDFActionButtons
                      documentType={getPDFDocumentType(documentType)}
                      documentId={Number(id)}
                    />
                  )}

                  {/* Save button */}
                  <Button
                    onClick={handleSave}
                    disabled={saving || isValidated || (documentType === 'devis' && status === 'closed')}
                    loading={saving}
                    icon={<Save style={{ width: '1rem', height: '1rem' }} />}
                    label={t('save')}
                    style={{ background: 'linear-gradient(135deg, #235ae4, #1a47b8)', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(35,90,228,0.35)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>



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



        {documentType === 'facture' && (
          <PaymentHistoryModal
            isOpen={showPaymentHistory}
            onClose={() => setShowPaymentHistory(false)}
            invoiceId={Number(id)}
            invoiceNumber={invoiceNumber}
            invoiceTotal={totalTTC}
            customerId={partner?.id}
            onPaymentUpdate={loadDocument}
          />
        )}
      </div>
    </AdminLayout>
  );
}
