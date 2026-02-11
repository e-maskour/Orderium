import { FileText, FileEdit, Truck } from 'lucide-react';
import { DocumentType, DocumentDirection, DocumentFeatures, DocumentStatus } from './document.types';

export interface DocumentConfig {
  type: DocumentType;
  direction: DocumentDirection;
  title: string;
  titleShort: string;
  prefix: string;
  icon: any;
  features: DocumentFeatures;
  statuses: DocumentStatus[];
  partnerLabel: string;
}

// Translation keys for document configs
const DOCUMENT_TRANSLATION_KEYS = {
  facture_vente: {
    title: 'salesInvoices',
    titleShort: 'salesInvoice',
    partnerLabel: 'client'
  },
  facture_achat: {
    title: 'purchaseInvoices',
    titleShort: 'purchaseInvoice',
    partnerLabel: 'supplier'
  },
  devis_vente: {
    title: 'quotes',
    titleShort: 'quote',
    partnerLabel: 'client'
  },
  devis_achat: {
    title: 'priceRequests',
    titleShort: 'priceRequest',
    partnerLabel: 'supplier'
  },
  bon_livraison_vente: {
    title: 'deliveryNotes',
    titleShort: 'deliveryNote',
    partnerLabel: 'client'
  },
  bon_livraison_achat: {
    title: 'purchaseOrders',
    titleShort: 'purchaseOrder',
    partnerLabel: 'supplier'
  }
};

export function getDocumentConfigs(t: (key: string) => string): Record<string, DocumentConfig> {
  return {
    facture_vente: {
      type: 'facture',
      direction: 'vente',
      title: t('salesInvoices'),
      titleShort: t('salesInvoice'),
      prefix: 'FA',
      icon: FileText,
      partnerLabel: t('client'),
      features: {
        hasPayments: true,
        hasValidation: true,
        canDownloadPDF: true,
        affectsInventory: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'unpaid', 'partial', 'paid']
    },
    facture_achat: {
      type: 'facture',
      direction: 'achat',
      title: t('purchaseInvoices'),
      titleShort: t('purchaseInvoice'),
      prefix: 'FB',
      icon: FileText,
      partnerLabel: t('supplier'),
      features: {
        hasPayments: true,
        hasValidation: true,
        canDownloadPDF: true,
        affectsInventory: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'unpaid', 'partial', 'paid']
    },
    devis_vente: {
      type: 'devis',
      direction: 'vente',
      title: t('quotes'),
      titleShort: t('quote'),
      prefix: 'DV',
      icon: FileEdit,
      partnerLabel: t('client'),
      features: {
        hasValidation: true,
        canDownloadPDF: true,
        canConvertToInvoice: true,
        expirationDate: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'open', 'signed', 'closed', 'delivered', 'invoiced']
    },
    bon_livraison_vente: {
      type: 'bon_livraison',
      direction: 'vente',
      title: t('deliveryNotes'),
      titleShort: t('deliveryNote'),
      prefix: 'BL',
      icon: Truck,
      partnerLabel: t('client'),
      features: {
        hasValidation: true,
        canDownloadPDF: true,
        linkedToInvoice: true,
        requiresSignature: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'validated', 'in_progress', 'delivered', 'cancelled']
    },
    devis_achat: {
      type: 'devis',
      direction: 'achat',
      title: t('priceRequests'),
      titleShort: t('priceRequest'),
      prefix: 'DP',
      icon: FileEdit,
      partnerLabel: t('supplier'),
      features: {
        hasValidation: true,
        canDownloadPDF: true,
        canConvertToInvoice: true,
        expirationDate: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'open', 'signed', 'closed', 'delivered', 'invoiced']
    },
    bon_livraison_achat: {
      type: 'bon_livraison',
      direction: 'achat',
      title: t('purchaseOrders'),
      titleShort: t('purchaseOrder'),
      prefix: 'BA',
      icon: Truck,
      partnerLabel: t('supplier'),
      features: {
        hasValidation: true,
        canDownloadPDF: true,
        linkedToInvoice: true,
        requiresSignature: true,
        showTax: true,
        showDiscount: true
      },
      statuses: ['draft', 'validated', 'in_progress', 'delivered', 'cancelled']
    }
  };
}

// Fallback configs with default English values (for backward compatibility)
export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  facture_vente: {
    type: 'facture',
    direction: 'vente',
    title: 'Factures de Vente',
    titleShort: 'Facture Client',
    prefix: 'FA',
    icon: FileText,
    partnerLabel: 'Client',
    features: {
      hasPayments: true,
      hasValidation: true,
      canDownloadPDF: true,
      affectsInventory: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'unpaid', 'partial', 'paid']
  },
  facture_achat: {
    type: 'facture',
    direction: 'achat',
    title: 'Factures d\'Achat',
    titleShort: 'Facture Fournisseur',
    prefix: 'FB',
    icon: FileText,
    partnerLabel: 'Fournisseur',
    features: {
      hasPayments: true,
      hasValidation: true,
      canDownloadPDF: true,
      affectsInventory: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'unpaid', 'partial', 'paid']
  },
  devis_vente: {
    type: 'devis',
    direction: 'vente',
    title: 'Devis',
    titleShort: 'Devis',
    prefix: 'DV',
    icon: FileEdit,
    partnerLabel: 'Client',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      canConvertToInvoice: true,
      expirationDate: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'open', 'signed', 'closed', 'delivered', 'invoiced']
  },
  bon_livraison_vente: {
    type: 'bon_livraison',
    direction: 'vente',
    title: 'Bons de Livraison',
    titleShort: 'Bon de Livraison',
    prefix: 'BL',
    icon: Truck,
    partnerLabel: 'Client',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      linkedToInvoice: true,
      requiresSignature: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'validated', 'in_progress', 'delivered', 'cancelled']
  },
  devis_achat: {
    type: 'devis',
    direction: 'achat',
    title: 'Demandes de Prix',
    titleShort: 'Demande de Prix',
    prefix: 'DP',
    icon: FileEdit,
    partnerLabel: 'Fournisseur',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      canConvertToInvoice: true,
      expirationDate: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'open', 'signed', 'closed', 'delivered', 'invoiced']
  },
  bon_livraison_achat: {
    type: 'bon_livraison',
    direction: 'achat',
    title: 'Bons d\'Achat',
    titleShort: 'Bon d\'Achat',
    prefix: 'BA',
    icon: Truck,
    partnerLabel: 'Fournisseur',
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      linkedToInvoice: true,
      requiresSignature: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'validated', 'in_progress', 'delivered', 'cancelled']
  }
};

export function getDocumentConfig(
  type: DocumentType, 
  direction: DocumentDirection = 'vente',
  t?: (key: string) => string
): DocumentConfig {
  const key = `${type}_${direction}`;
  
  // If translation function is provided, use translated configs
  if (t) {
    const configs = getDocumentConfigs(t);
    return configs[key] || configs.facture_vente;
  }
  
  // Otherwise, use fallback configs
  return DOCUMENT_CONFIGS[key] || DOCUMENT_CONFIGS.facture_vente;
}

export function getDocumentIcon(type: DocumentType): any {
  switch (type) {
    case 'facture':
      return FileText;
    case 'devis':
      return FileEdit;
    case 'bon_livraison':
      return Truck;
    default:
      return FileText;
  }
}
