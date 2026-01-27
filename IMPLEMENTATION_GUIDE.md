# 🛠️ Implementation Guide - Unified Document System

**Quick Start Guide for Developers**

---

## 📦 Component Specifications

### 1. DocumentItemsTable Component

**Purpose:** Unified items table for all document types

**File:** `backoffice/src/components/documents/DocumentItemsTable.tsx`

```typescript
import React, { useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { DocumentItem, Product } from '@/types';

interface DocumentItemsTableProps {
  items: DocumentItem[];
  direction: 'vente' | 'achat';
  readOnly?: boolean;
  onItemsChange: (items: DocumentItem[]) => void;
  showTaxColumn?: boolean;
  showDiscountColumn?: boolean;
}

export function DocumentItemsTable({
  items,
  direction,
  readOnly = false,
  onItemsChange,
  showTaxColumn = true,
  showDiscountColumn = true
}: DocumentItemsTableProps) {
  // Reuse logic from FactureForm but make it generic
  // - Product search and autocomplete
  // - Inline calculations
  // - Add/remove rows
  // - Catalogue integration
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4">Articles</h3>
      
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            <th className="text-left py-2 px-2">Description</th>
            <th className="text-left py-2 px-2 w-24">Quantité</th>
            <th className="text-left py-2 px-2 w-32">Prix Unit.</th>
            {showDiscountColumn && (
              <th className="text-left py-2 px-2 w-24">Remise</th>
            )}
            {showTaxColumn && (
              <th className="text-left py-2 px-2 w-20">TVA</th>
            )}
            <th className="text-center py-2 px-2 w-32">Total</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <DocumentItemRow
              key={item.id}
              item={item}
              direction={direction}
              readOnly={readOnly}
              showTax={showTaxColumn}
              showDiscount={showDiscountColumn}
              onChange={(updated) => updateItem(item.id, updated)}
              onRemove={() => removeItem(item.id)}
            />
          ))}
        </tbody>
      </table>
      
      {!readOnly && (
        <div className="mt-4 flex gap-2">
          <button onClick={addItem} className="btn-primary">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={openCatalogue} className="btn-secondary">
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
```

**Key Features:**
- ✅ Reuses item logic from FactureForm
- ✅ Configurable columns (tax, discount)
- ✅ Product search with debouncing
- ✅ Inline calculations
- ✅ Read-only mode support

---

### 2. DocumentPartnerBox Component

**File:** `backoffice/src/components/documents/DocumentPartnerBox.tsx`

```typescript
interface DocumentPartnerBoxProps {
  direction: 'vente' | 'achat';
  partner?: Partial<Partner>;
  onPartnerChange: (partner: Partner) => void;
  readOnly?: boolean;
}

export function DocumentPartnerBox({
  direction,
  partner,
  onPartnerChange,
  readOnly = false
}: DocumentPartnerBoxProps) {
  const label = direction === 'vente' ? 'Client' : 'Fournisseur';
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="text-base font-bold text-slate-800 mb-3">
        Informations {label}
      </h3>
      
      <div className="space-y-3">
        <PartnerSearch
          label={label}
          value={partner?.name || ''}
          onChange={onPartnerChange}
          filterType={direction === 'vente' ? 'customer' : 'supplier'}
          readOnly={readOnly}
        />
        
        {partner && (
          <>
            <InfoField label="Téléphone" value={partner.phone} />
            <InfoField label="Adresse" value={partner.address} />
            {partner.ice && <InfoField label="ICE" value={partner.ice} />}
          </>
        )}
      </div>
    </div>
  );
}
```

---

### 3. DocumentTotalsSection Component

**File:** `backoffice/src/components/documents/DocumentTotalsSection.tsx`

```typescript
interface DocumentTotalsSectionProps {
  items: DocumentItem[];
  displayMode?: 'simple' | 'detailed';
}

export function DocumentTotalsSection({
  items,
  displayMode = 'detailed'
}: DocumentTotalsSectionProps) {
  const { totalHT, totalTVA, totalTTC, taxByRate } = useDocumentCalculation(items);
  
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center text-slate-700">
        <span>Total HT:</span>
        <span className="font-semibold">{totalHT.toFixed(2)} DH</span>
      </div>
      
      {displayMode === 'detailed' && Object.entries(taxByRate).map(([rate, amount]) => (
        <div key={rate} className="flex justify-between items-center text-slate-700">
          <span>Total TVA {rate}%:</span>
          <span className="font-semibold">{amount.toFixed(2)} DH</span>
        </div>
      ))}
      
      {Object.keys(taxByRate).length > 0 && (
        <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-2">
          <span className="font-semibold">Total TVA:</span>
          <span className="font-semibold">{totalTVA.toFixed(2)} DH</span>
        </div>
      )}
      
      <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
        <span className="text-lg font-bold text-slate-900">Total TTC:</span>
        <span className="text-2xl font-bold text-amber-600">{totalTTC.toFixed(2)} DH</span>
      </div>
    </div>
  );
}
```

---

### 4. DocumentForm Component

**File:** `backoffice/src/components/documents/DocumentForm.tsx`

```typescript
interface DocumentFormProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  initialData?: DocumentWithDetails;
  readOnly?: boolean;
  onSubmit: (data: CreateDocumentDTO) => Promise<void>;
  onCancel: () => void;
  config?: DocumentConfig;
}

export function DocumentForm({
  documentType,
  direction,
  initialData,
  readOnly = false,
  onSubmit,
  onCancel,
  config
}: DocumentFormProps) {
  const [formData, setFormData] = useState(initialData || getDefaultFormData());
  const { totalHT, totalTVA, totalTTC } = useDocumentCalculation(formData.items);
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Partner & Document Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DocumentPartnerBox
          direction={direction}
          partner={formData.partner}
          onPartnerChange={(p) => setFormData({ ...formData, partner: p })}
          readOnly={readOnly}
        />
        
        <DocumentInfoBox
          date={formData.date}
          dueDate={formData.dueDate}
          expirationDate={config?.features.expirationDate ? formData.expirationDate : undefined}
          onChange={(field, value) => setFormData({ ...formData, [field]: value })}
          readOnly={readOnly}
        />
      </div>
      
      {/* Items Table */}
      <DocumentItemsTable
        items={formData.items}
        direction={direction}
        readOnly={readOnly}
        onItemsChange={(items) => setFormData({ ...formData, items })}
        showTaxColumn={config?.features.showTax}
        showDiscountColumn={config?.features.showDiscount}
      />
      
      {/* Totals & Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DocumentNotesField
          value={formData.notes}
          onChange={(notes) => setFormData({ ...formData, notes })}
          readOnly={readOnly}
        />
        
        <DocumentTotalsSection items={formData.items} />
      </div>
      
      {/* Actions */}
      <DocumentFormActions
        onCancel={onCancel}
        onSubmit={handleSubmit}
        readOnly={readOnly}
        documentType={documentType}
      />
    </form>
  );
}
```

---

### 5. DocumentTable Component

**File:** `backoffice/src/components/documents/DocumentTable.tsx`

```typescript
interface DocumentTableProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  documents: BaseDocument[];
  loading?: boolean;
  config: DocumentTableConfig;
  onEdit: (id: number) => void;
  onDelete?: (id: number) => void;
  onDownload?: (id: number) => void;
  onValidate?: (id: number) => void;
  onDevalidate?: (id: number) => void;
  onViewPayments?: (id: number) => void;
  onConvert?: (id: number, toType: DocumentType) => void;
}

export function DocumentTable({
  documents,
  loading,
  config,
  ...handlers
}: DocumentTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  
  const partnerLabel = config.direction === 'vente' ? 'Client' : 'Fournisseur';
  
  return (
    <div className="space-y-4">
      {/* Search */}
      <DocumentTableSearch
        value={searchTerm}
        onChange={setSearchTerm}
        placeholder={`Rechercher par numéro ou ${partnerLabel.toLowerCase()}...`}
      />
      
      {/* Floating Action Bar */}
      <FloatingActionBar
        selectedCount={selectedDocs.length}
        onClearSelection={() => setSelectedDocs([])}
        actions={getAvailableActions(config, selectedDocs, documents)}
      />
      
      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th><SelectAllCheckbox /></th>
              <th>Numéro</th>
              <th>Date</th>
              <th>{partnerLabel}</th>
              <th>Articles</th>
              <th className="text-right">Montant</th>
              <th className="text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <DocumentTableRow
                key={doc.id}
                document={doc}
                selected={selectedDocs.includes(doc.id)}
                onSelect={() => toggleSelection(doc.id)}
                onEdit={() => handlers.onEdit(doc.id)}
                config={config}
              />
            ))}
          </tbody>
        </table>
        
        {/* Pagination */}
        <DocumentTablePagination />
      </div>
    </div>
  );
}
```

---

## 🎣 Custom Hooks

### useDocument Hook

```typescript
// backoffice/src/modules/documents/hooks/useDocument.ts

export function useDocument(id: number | undefined, documentType: DocumentType) {
  const [document, setDocument] = useState<DocumentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const service = useDocumentsService();
  
  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await service.getById(id);
      setDocument(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id, service]);
  
  const save = useCallback(async (data: UpdateDocumentDTO) => {
    if (!id) return;
    const updated = await service.update(id, data);
    setDocument(updated);
    return updated;
  }, [id, service]);
  
  const validate = useCallback(async () => {
    if (!id) return;
    const updated = await service.validate(id);
    setDocument(updated);
    return updated;
  }, [id, service]);
  
  const devalidate = useCallback(async () => {
    if (!id) return;
    const updated = await service.devalidate(id);
    setDocument(updated);
    return updated;
  }, [id, service]);
  
  useEffect(() => {
    load();
  }, [load]);
  
  return {
    document,
    loading,
    error,
    reload: load,
    save,
    validate,
    devalidate
  };
}
```

### useDocumentCalculation Hook

```typescript
// backoffice/src/modules/documents/hooks/useDocumentCalculation.ts

export function useDocumentCalculation(items: DocumentItem[]) {
  const calculations = useMemo(() => {
    // Total HT
    const totalHT = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountAmount = item.discountType === 1 
        ? itemSubtotal * (item.discount / 100) 
        : item.discount;
      return sum + (itemSubtotal - discountAmount);
    }, 0);
    
    // Tax by rate
    const taxByRate = items.reduce((acc, item) => {
      if (item.tax > 0) {
        const itemSubtotal = item.quantity * item.unitPrice;
        const discountAmount = item.discountType === 1 
          ? itemSubtotal * (item.discount / 100) 
          : item.discount;
        const itemHT = itemSubtotal - discountAmount;
        const itemTVA = itemHT * (item.tax / 100);
        
        if (!acc[item.tax]) acc[item.tax] = 0;
        acc[item.tax] += itemTVA;
      }
      return acc;
    }, {} as Record<number, number>);
    
    // Total TVA
    const totalTVA = Object.values(taxByRate).reduce((sum, tva) => sum + tva, 0);
    
    // Total TTC
    const totalTTC = totalHT + totalTVA;
    
    return { totalHT, totalTVA, totalTTC, taxByRate };
  }, [items]);
  
  return calculations;
}
```

---

## 📄 Generic Page Templates

### DocumentListPage

```typescript
// backoffice/src/pages/documents/DocumentListPage.tsx

interface DocumentListPageProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  title: string;
  subtitle?: string;
  createRoute: string;
  features: DocumentFeatures;
}

export function DocumentListPage({
  documentType,
  direction,
  title,
  subtitle,
  createRoute,
  features
}: DocumentListPageProps) {
  const navigate = useNavigate();
  const { documents, loading, reload } = useDocumentList(documentType, direction);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={getDocumentIcon(documentType)}
          title={title}
          subtitle={subtitle}
          actions={
            <button onClick={() => navigate(createRoute)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Nouveau
            </button>
          }
        />
        
        <DocumentTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={['dashboard', 'list']}
        />
        
        <div className="p-3 pt-2">
          {activeTab === 'dashboard' && (
            <DocumentDashboard
              documents={documents}
              documentType={documentType}
              direction={direction}
            />
          )}
          
          {activeTab === 'list' && (
            <DocumentTable
              documentType={documentType}
              direction={direction}
              documents={documents}
              loading={loading}
              config={{ features, direction }}
              onEdit={(id) => navigate(`${createRoute.replace('/create', '')}/${id}`)}
              onDelete={handleDelete}
              {...getHandlers(features)}
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
```

### DocumentCreatePage

```typescript
// backoffice/src/pages/documents/DocumentCreatePage.tsx

interface DocumentCreatePageProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  title: string;
  backRoute: string;
  features: DocumentFeatures;
}

export function DocumentCreatePage({
  documentType,
  direction,
  title,
  backRoute,
  features
}: DocumentCreatePageProps) {
  const navigate = useNavigate();
  const service = useDocumentsService();
  const [loading, setLoading] = useState(false);
  
  const handleCreate = async (data: CreateDocumentDTO) => {
    try {
      setLoading(true);
      const newDoc = await service.create(documentType, direction, data);
      navigate(`${backRoute}/${newDoc.id}`);
    } catch (error) {
      console.error('Error creating document:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <PageHeader
          icon={getDocumentIcon(documentType)}
          title={title}
          subtitle={`Créer un nouveau ${getDocumentLabel(documentType, direction)}`}
          actions={
            <button onClick={() => navigate(backRoute)} className="btn-secondary">
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          }
        />
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <DocumentForm
            documentType={documentType}
            direction={direction}
            onSubmit={handleCreate}
            onCancel={() => navigate(backRoute)}
            loading={loading}
            config={getDocumentConfig(documentType)}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
```

---

## 🔄 Usage Examples

### Example 1: Facture Vente Page (New Implementation)

```typescript
// backoffice/src/pages/factures/FactureVente.tsx

export default function FactureVente() {
  return (
    <DocumentListPage
      documentType="facture"
      direction="vente"
      title="Factures de Vente"
      subtitle="Gérez vos factures clients"
      createRoute="/factures/vente/create"
      features={{
        hasPayments: true,
        hasValidation: true,
        canDownloadPDF: true,
        affectsInventory: true,
        showTax: true,
        showDiscount: true
      }}
    />
  );
}
```

### Example 2: Devis Page (New)

```typescript
// backoffice/src/pages/devis/Devis.tsx

export default function Devis() {
  return (
    <DocumentListPage
      documentType="devis"
      direction="vente"
      title="Devis Clients"
      subtitle="Gérez vos devis et convertissez-les en factures"
      createRoute="/devis/create"
      features={{
        hasPayments: false,
        hasValidation: true,
        canDownloadPDF: true,
        canConvertToInvoice: true,
        expirationDate: true,
        showTax: true,
        showDiscount: true
      }}
    />
  );
}
```

### Example 3: Bon de Livraison Page (New)

```typescript
// backoffice/src/pages/bons-livraison/BonLivraison.tsx

export default function BonLivraison() {
  return (
    <DocumentListPage
      documentType="bon_livraison"
      direction="vente"
      title="Bons de Livraison"
      subtitle="Gérez vos bons de livraison"
      createRoute="/bons-livraison/create"
      features={{
        hasPayments: false,
        hasValidation: true,
        canDownloadPDF: true,
        linkedToInvoice: true,
        requiresSignature: true,
        showTax: false,
        showDiscount: false
      }}
    />
  );
}
```

---

## 🎨 Document Configuration System

```typescript
// backoffice/src/modules/documents/types/document-config.ts

export interface DocumentFeatures {
  hasPayments?: boolean;
  hasValidation?: boolean;
  canDownloadPDF?: boolean;
  canConvertToInvoice?: boolean;
  affectsInventory?: boolean;
  linkedToInvoice?: boolean;
  requiresSignature?: boolean;
  expirationDate?: boolean;
  showTax?: boolean;
  showDiscount?: boolean;
}

export interface DocumentConfig {
  type: DocumentType;
  direction: DocumentDirection;
  title: string;
  titleShort: string;
  prefix: string;
  icon: LucideIcon;
  features: DocumentFeatures;
  statuses: DocumentStatus[];
  pdfTemplate: string;
}

export const DOCUMENT_CONFIGS: Record<string, DocumentConfig> = {
  facture_vente: {
    type: 'facture',
    direction: 'vente',
    title: 'Facture de Vente',
    titleShort: 'Facture Client',
    prefix: 'FA',
    icon: FileText,
    features: {
      hasPayments: true,
      hasValidation: true,
      canDownloadPDF: true,
      affectsInventory: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'unpaid', 'partial', 'paid'],
    pdfTemplate: 'facture'
  },
  devis_vente: {
    type: 'devis',
    direction: 'vente',
    title: 'Devis Client',
    titleShort: 'Devis',
    prefix: 'DV',
    icon: FileEdit,
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      canConvertToInvoice: true,
      expirationDate: true,
      showTax: true,
      showDiscount: true
    },
    statuses: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    pdfTemplate: 'devis'
  },
  bon_livraison: {
    type: 'bon_livraison',
    direction: 'vente',
    title: 'Bon de Livraison',
    titleShort: 'BL',
    prefix: 'BL',
    icon: Truck,
    features: {
      hasValidation: true,
      canDownloadPDF: true,
      linkedToInvoice: true,
      requiresSignature: true,
      showTax: false,
      showDiscount: false
    },
    statuses: ['draft', 'prepared', 'delivered', 'returned'],
    pdfTemplate: 'bon_livraison'
  }
};

export function getDocumentConfig(type: DocumentType, direction: DocumentDirection = 'vente'): DocumentConfig {
  const key = `${type}_${direction}`;
  return DOCUMENT_CONFIGS[key] || DOCUMENT_CONFIGS.facture_vente;
}
```

---

## ⚡ Quick Win: First Refactoring

**Start with FactureForm → DocumentForm**

1. Copy `FactureForm.tsx` to `DocumentForm.tsx`
2. Add props: `documentType`, `direction`, `config`
3. Replace hardcoded strings with config values
4. Make conditional rendering based on `config.features`
5. Test with FactureVente
6. Replace FactureAchat to use same component
7. Delete old FactureForm

**Estimated Time:** 4-6 hours  
**Impact:** Immediate 50% code reduction in form logic

---

## 📚 Additional Resources

- [TypeScript Generics Guide](https://www.typescriptlang.org/docs/handbook/2/generics.html)
- [React Component Patterns](https://kentcdodds.com/blog/compound-components-with-react-hooks)
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy)

---

**Next:** Start Phase 1 Implementation
