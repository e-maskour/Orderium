# 🏗️ Unified Document Architecture - Orderium

**Date:** January 26, 2026  
**Purpose:** Refactor invoice system to support Factures, Devis, and Bons de Livraison with shared, reusable components

---

## 📋 Executive Summary

The current invoice implementation contains **significant code duplication**:
- `FactureVente.tsx` and `FactureAchat.tsx` are **544 lines each** with 95% identical code
- Create/Edit pages are duplicated for each type
- PDF generation is embedded in backend service
- No support for Devis (Quotes) or Bons de Livraison (Delivery Notes)

**Goal:** Create a unified document system where all document types share:
- Same UI components
- Same business logic
- Same PDF generation
- Same validation flows
- Only document-specific fields/rules differ

---

## 🎯 Proposed Architecture

### 1. **Document Types & Their Characteristics**

```typescript
// Core document types
type DocumentType = 'facture' | 'devis' | 'bon_livraison';
type DocumentDirection = 'vente' | 'achat'; // sales or purchase

// Document characteristics
const DOCUMENT_CONFIG = {
  facture_vente: {
    type: 'facture',
    direction: 'vente',
    title: 'Facture de Vente',
    titleShort: 'Facture Client',
    prefix: 'FA',
    features: {
      hasPayments: true,
      hasValidation: true,
      canGeneratePDF: true,
      affectsInventory: true,
      requiresPartner: true,
      requiredTaxes: true
    }
  },
  facture_achat: {
    type: 'facture',
    direction: 'achat',
    title: 'Facture d\'Achat',
    titleShort: 'Facture Fournisseur',
    prefix: 'FB',
    features: { /* ... */ }
  },
  devis_vente: {
    type: 'devis',
    direction: 'vente',
    title: 'Devis Client',
    prefix: 'DV',
    features: {
      hasPayments: false,
      hasValidation: true,
      canConvertToInvoice: true,
      canConvertToBonDeLivraison: true
      expirationDate: true,
      requiredTaxes: false
    }
  },
  bon_livraison: {
    type: 'bon_livraison',
    direction: 'vente',
    title: 'Bon de Livraison',
    prefix: 'BL',
    features: {
      hasPayments: false,
      hasValidation: true,
      linkedToInvoice: true,
      requiresSignature: true,
      requiredTaxes: false
    }
  }
};
```

---

## 🗂️ New Folder Structure

### **Backend (API)**

```
api/src/modules/
├── documents/                    # NEW - Unified document module
│   ├── documents.module.ts
│   ├── documents.controller.ts
│   ├── documents.service.ts      # Shared business logic
│   ├── entities/
│   │   ├── document.entity.ts    # Base document entity
│   │   ├── document-item.entity.ts
│   │   └── document-metadata.entity.ts
│   ├── dto/
│   │   ├── create-document.dto.ts
│   │   ├── update-document.dto.ts
│   │   └── convert-document.dto.ts
│   ├── types/
│   │   └── document-types.ts
│   └── strategies/               # Type-specific logic
│       ├── facture.strategy.ts
│       ├── devis.strategy.ts
│       └── bon-livraison.strategy.ts
├── invoices/                     # REFACTOR - Thin wrapper
│   └── (delegates to documents module)
└── pdf/                          # ENHANCE
    ├── pdf.service.ts
    ├── templates/
    │   ├── base-document.template.ts
    │   ├── facture.template.ts
    │   ├── devis.template.ts
    │   └── bon-livraison.template.ts
    └── generators/
        ├── pdf-generator.ts
        └── pdf-utils.ts
```

### **Frontend (Backoffice)**

```
backoffice/src/
├── modules/
│   └── documents/                # NEW - Unified document module
│       ├── types/
│       │   ├── document.types.ts
│       │   ├── document-config.ts
│       │   └── index.ts
│       ├── models/
│       │   ├── document.model.ts
│       │   └── document-item.model.ts
│       ├── services/
│       │   ├── documents.service.ts
│       │   └── document-calculations.service.ts
│       ├── hooks/
│       │   ├── useDocument.ts
│       │   ├── useDocumentList.ts
│       │   ├── useDocumentCalculation.ts
│       │   ├── useDocumentValidation.ts
│       │   └── useDocumentPDF.ts
│       └── utils/
│           ├── document-formatters.ts
│           └── document-validators.ts
├── components/
│   ├── documents/                # NEW - Shared document components
│   │   ├── DocumentHeader.tsx    # Reusable header (number, date, status)
│   │   ├── DocumentPartnerBox.tsx # Customer/Supplier info
│   │   ├── DocumentItemsTable.tsx # Items table with add/edit
│   │   ├── DocumentTotalsSection.tsx # Calculations display
│   │   ├── DocumentFooter.tsx    # Notes, terms, etc.
│   │   ├── DocumentForm.tsx      # Main form wrapper
│   │   ├── DocumentTable.tsx     # List/grid view
│   │   ├── DocumentValidationBar.tsx # Validate/Devalidate UI
│   │   ├── DocumentPreviewModal.tsx # PDF preview
│   │   └── DocumentStatusBadge.tsx # Status indicator
│   └── (existing components...)
└── pages/
    ├── documents/                # NEW - Generic document pages
    │   ├── DocumentListPage.tsx  # Generic list page
    │   ├── DocumentCreatePage.tsx # Generic create page
    │   ├── DocumentEditPage.tsx  # Generic edit page
    │   └── DocumentDashboard.tsx # Generic dashboard
    ├── factures/                 # SIMPLIFIED - Configuration only
    │   ├── FactureVente.tsx      # Uses DocumentListPage
    │   └── FactureAchat.tsx      # Uses DocumentListPage
    ├── devis/                    # NEW
    │   └── Devis.tsx             # Uses DocumentListPage
    └── bons-livraison/           # NEW
        └── BonLivraison.tsx      # Uses DocumentListPage
```

---

## 🧩 Shared Components Design

### 1. **DocumentForm.tsx** - Universal Form Component

```typescript
interface DocumentFormProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  initialData?: DocumentWithDetails;
  readOnly?: boolean;
  onSubmit: (data: CreateDocumentDTO) => Promise<void>;
  onCancel: () => void;
}

// Features:
// - Partner selection (customer/supplier)
// - Items table with product search
// - Calculations (HT, TVA, TTC)
// - Validation rules per document type
// - Conditional fields based on type
```

### 2. **DocumentItemsTable.tsx** - Items Management

```typescript
interface DocumentItemsTableProps {
  items: DocumentItem[];
  direction: 'vente' | 'achat';
  readOnly?: boolean;
  onItemsChange: (items: DocumentItem[]) => void;
  showTaxColumn?: boolean;
  showDiscountColumn?: boolean;
}

// Features:
// - Add/remove rows
// - Product search & autocomplete
// - Inline calculations
// - Tax/discount handling
// - Catalogue modal integration
```

### 3. **DocumentTable.tsx** - List View

```typescript
interface DocumentTableProps {
  documentType: DocumentType;
  direction: DocumentDirection;
  documents: Document[];
  loading?: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onDownload?: (id: number) => void;
  onValidate?: (id: number) => void;
  onDevalidate?: (id: number) => void;
  onViewPayments?: (id: number) => void;
  onConvert?: (id: number, toType: DocumentType) => void; // Devis → Facture
}

// Features:
// - Search/filter
// - Sorting
// - Pagination
// - Bulk actions
// - Status indicators
// - Conditional columns based on type
```

### 4. **DocumentPartnerBox.tsx** - Partner Information

```typescript
interface DocumentPartnerBoxProps {
  direction: 'vente' | 'achat';
  partner?: Partner;
  onPartnerChange: (partner: Partner) => void;
  readOnly?: boolean;
}

// Features:
// - Partner search
// - Auto-fill address, phone, ICE
// - Create new partner inline
// - Validation
```

### 5. **DocumentTotalsSection.tsx** - Calculations Display

```typescript
interface DocumentTotalsSectionProps {
  items: DocumentItem[];
  globalDiscount?: number;
  globalTax?: number;
  displayMode?: 'simple' | 'detailed';
}

// Features:
// - Total HT (before tax)
// - TVA breakdown by rate
// - Total TTC (including tax)
// - Discount display
// - Format numbers correctly
```

---

## 🔧 Shared Hooks & Services

### **Hooks**

```typescript
// useDocument.ts - Manage single document
const { document, loading, save, validate, devalidate } = useDocument(id, type);

// useDocumentList.ts - Manage document list
const { documents, loading, filters, setFilters } = useDocumentList(type, direction);

// useDocumentCalculation.ts - Calculate totals
const { totalHT, totalTVA, totalTTC, taxByRate } = useDocumentCalculation(items);

// useDocumentPDF.ts - PDF generation
const { downloadPDF, previewPDF, generating } = useDocumentPDF();

// useDocumentConversion.ts - Convert between types
const { convertToInvoice, converting } = useDocumentConversion();
```

### **Services**

```typescript
// documents.service.ts
class DocumentsService {
  async getAll(type: DocumentType, direction: DocumentDirection): Promise<Document[]>
  async getById(id: number): Promise<DocumentWithDetails>
  async create(type: DocumentType, data: CreateDocumentDTO): Promise<Document>
  async update(id: number, data: UpdateDocumentDTO): Promise<Document>
  async delete(id: number): Promise<void>
  async validate(id: number): Promise<Document>
  async devalidate(id: number): Promise<Document>
  async convert(id: number, toType: DocumentType): Promise<Document>
  async downloadPDF(id: number): Promise<Blob>
}

// document-calculations.service.ts
class DocumentCalculationsService {
  calculateItemTotal(item: DocumentItem): number
  calculateSubtotal(items: DocumentItem[]): number
  calculateTaxByRate(items: DocumentItem[]): Record<number, number>
  calculateGrandTotal(items: DocumentItem[]): number
  validateMinPrice(item: DocumentItem, product: Product): boolean
}
```

---

## 🎨 Unified TypeScript Interfaces

```typescript
// Base document interface
interface BaseDocument {
  id: number;
  documentNumber: string;
  documentType: DocumentType;
  direction: DocumentDirection;
  
  // Partner info
  partnerId?: number;
  partnerName?: string;
  partnerPhone?: string;
  partnerAddress?: string;
  partnerIce?: string;
  
  // Dates
  date: string;
  dueDate?: string;
  expirationDate?: string; // For devis
  
  // Amounts
  subtotal: number;
  tax: number;
  discount: number;
  discountType: number;
  total: number;
  
  // Status
  status: DocumentStatus;
  isValidated: boolean;
  
  // Metadata
  notes?: string;
  internalNotes?: string;
  termsAndConditions?: string;
  
  // Relationships
  linkedDocumentId?: number; // BL → Facture, Devis → Facture
  
  // Timestamps
  dateCreated: string;
  dateUpdated: string;
}

interface DocumentItem {
  id: number;
  documentId: number;
  productId?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: number;
  tax: number;
  total: number;
}

interface DocumentWithDetails {
  document: BaseDocument;
  items: DocumentItem[];
  partner?: Partner;
  linkedDocument?: BaseDocument; // For conversions
}

type DocumentStatus = 
  | 'draft' 
  | 'unpaid' 
  | 'partial' 
  | 'paid' 
  | 'expired' // Devis only
  | 'delivered' // Bon de livraison only
  | 'cancelled';
```

---

## 📊 Database Schema Changes

### **Option 1: Single Polymorphic Table (Recommended)**

```sql
-- Extend existing invoices table
ALTER TABLE invoices 
  ADD COLUMN document_type VARCHAR(50) DEFAULT 'facture',
  ADD COLUMN direction VARCHAR(10) DEFAULT 'vente',
  ADD COLUMN expiration_date DATE NULL,
  ADD COLUMN linked_document_id INTEGER NULL,
  ADD COLUMN signature_data TEXT NULL, -- For bon de livraison
  ADD COLUMN internal_notes TEXT NULL;

-- Add indexes
CREATE INDEX idx_invoices_document_type ON invoices(document_type);
CREATE INDEX idx_invoices_direction ON invoices(direction);
CREATE INDEX idx_invoices_linked_document ON invoices(linked_document_id);

-- Migrate existing data
UPDATE invoices SET document_type = 'facture', direction = 'vente' WHERE customer_id IS NOT NULL;
UPDATE invoices SET document_type = 'facture', direction = 'achat' WHERE supplier_id IS NOT NULL;
```

### **Option 2: Separate Tables with Inheritance**

```sql
-- Keep invoices table as is, add new tables for other types
CREATE TABLE devis (
  id SERIAL PRIMARY KEY,
  -- Same structure as invoices
  expiration_date DATE,
  converted_to_invoice_id INTEGER REFERENCES invoices(id)
);

CREATE TABLE bons_livraison (
  id SERIAL PRIMARY KEY,
  -- Same structure as invoices
  invoice_id INTEGER REFERENCES invoices(id),
  signature_data TEXT,
  delivery_date DATE
);
```

**Recommendation:** Option 1 is simpler and allows unified queries.

---

## 🚀 Migration Plan

### **Phase 1: Backend Foundation** (Week 1-2)

1. **Create documents module structure**
   - [ ] Create `/api/src/modules/documents` folder
   - [ ] Define base entity and DTOs
   - [ ] Implement DocumentsService with CRUD
   - [ ] Add migration for database schema changes
   - [ ] Create document strategies pattern

2. **Refactor invoice module**
   - [ ] Make InvoicesService delegate to DocumentsService
   - [ ] Maintain backward compatibility
   - [ ] Add integration tests

3. **Enhance PDF service**
   - [ ] Extract template system
   - [ ] Create base template
   - [ ] Implement type-specific templates
   - [ ] Add PDF preview endpoint

### **Phase 2: Frontend Shared Components** (Week 2-3)

1. **Create document module structure**
   - [ ] Create `/backoffice/src/modules/documents`
   - [ ] Define TypeScript interfaces
   - [ ] Implement shared services
   - [ ] Create calculation utilities

2. **Build reusable components**
   - [ ] DocumentHeader
   - [ ] DocumentPartnerBox
   - [ ] DocumentItemsTable (refactor from FactureForm)
   - [ ] DocumentTotalsSection
   - [ ] DocumentValidationBar
   - [ ] DocumentStatusBadge
   - [ ] DocumentPreviewModal

3. **Create custom hooks**
   - [ ] useDocument
   - [ ] useDocumentList
   - [ ] useDocumentCalculation
   - [ ] useDocumentPDF

### **Phase 3: Refactor Existing Pages** (Week 3-4)

1. **Create generic page templates**
   - [ ] DocumentListPage.tsx
   - [ ] DocumentCreatePage.tsx
   - [ ] DocumentEditPage.tsx
   - [ ] DocumentDashboard.tsx

2. **Refactor Facture Vente**
   - [ ] Replace FactureVente.tsx with DocumentListPage
   - [ ] Replace FactureVenteCreate.tsx with DocumentCreatePage
   - [ ] Replace FactureVenteEdit.tsx with DocumentEditPage
   - [ ] Test thoroughly

3. **Refactor Facture Achat**
   - [ ] Same process as Facture Vente
   - [ ] Ensure partner type filtering works

### **Phase 4: Add New Document Types** (Week 4-5)

1. **Implement Devis**
   - [ ] Configure document type settings
   - [ ] Add expiration date logic
   - [ ] Implement convert-to-invoice feature
   - [ ] Create Devis pages using generic templates
   - [ ] Add PDF template

2. **Implement Bon de Livraison**
   - [ ] Configure document type settings
   - [ ] Add signature capture
   - [ ] Link to invoices
   - [ ] Create BL pages using generic templates
   - [ ] Add PDF template

### **Phase 5: Testing & Cleanup** (Week 5-6)

1. **Testing**
   - [ ] Unit tests for services
   - [ ] Integration tests
   - [ ] E2E tests for all document types
   - [ ] PDF generation tests

2. **Cleanup**
   - [ ] Remove old duplicated components
   - [ ] Remove old duplicated pages
   - [ ] Update documentation
   - [ ] Performance optimization

3. **Polish**
   - [ ] UI/UX improvements
   - [ ] Error handling
   - [ ] Loading states
   - [ ] Accessibility

---

## 📈 Benefits of This Architecture

### **Code Reduction**
- **Before:** ~2,176 lines (4 pages × 544 lines)
- **After:** ~800 lines (shared components + config)
- **Savings:** ~63% reduction

### **Maintainability**
- Bug fixes apply to all document types
- New features benefit all types
- Single source of truth for business logic

### **Scalability**
- Easy to add new document types (e.g., Proforma, Avoir)
- Type-specific logic isolated in strategies
- Clear extension points

### **Developer Experience**
- Intuitive component API
- Type-safe with TypeScript
- Self-documenting code

### **User Experience**
- Consistent UI across all document types
- Familiar workflows
- Easier to learn

---

## 🎯 Key Design Principles

1. **Composition over Inheritance**
   - Use props and configuration instead of extending classes
   - Make components highly configurable

2. **Single Responsibility**
   - Each component does one thing well
   - Business logic separated from UI

3. **DRY (Don't Repeat Yourself)**
   - Shared logic in hooks and services
   - Reusable UI components

4. **Type Safety**
   - Strong TypeScript types throughout
   - Compile-time error catching

5. **Progressive Enhancement**
   - Start with core features
   - Add type-specific features as needed

---

## 📝 Implementation Example

### **Before: Duplicated Code**

```typescript
// FactureVente.tsx - 544 lines
// FactureAchat.tsx - 544 lines (95% identical)
// Total: 1,088 lines
```

### **After: Shared Architecture**

```typescript
// pages/factures/FactureVente.tsx - 50 lines
import { DocumentListPage } from '../documents/DocumentListPage';

export default function FactureVente() {
  return (
    <DocumentListPage
      documentType="facture"
      direction="vente"
      title="Factures de Vente"
      createRoute="/factures/vente/create"
      features={{
        hasPayments: true,
        hasValidation: true,
        canDownloadPDF: true
      }}
    />
  );
}

// pages/factures/FactureAchat.tsx - 50 lines
export default function FactureAchat() {
  return (
    <DocumentListPage
      documentType="facture"
      direction="achat"
      title="Factures d'Achat"
      createRoute="/factures/achat/create"
      features={{
        hasPayments: true,
        hasValidation: true,
        canDownloadPDF: true
      }}
    />
  );
}

// pages/devis/Devis.tsx - 50 lines
export default function Devis() {
  return (
    <DocumentListPage
      documentType="devis"
      direction="vente"
      title="Devis Clients"
      createRoute="/devis/create"
      features={{
        hasExpiration: true,
        canConvertToInvoice: true,
        canDownloadPDF: true
      }}
    />
  );
}

// Total: 150 lines vs 1,632 lines (3 types × 544)
// Reduction: 91%
```

---

## 🔐 Backward Compatibility

During migration, maintain backward compatibility:

1. **API Endpoints**
   ```
   /api/invoices → delegates to /api/documents?type=facture
   /api/invoices/:id → delegates to /api/documents/:id
   ```

2. **Database**
   - Existing invoice records work seamlessly
   - Gradual migration of data structure

3. **Frontend Routes**
   - Keep existing routes
   - Redirect to new components internally

---

## ✅ Success Metrics

- [ ] Zero code duplication between document types
- [ ] All document types share >90% of code
- [ ] New document type can be added in <1 day
- [ ] Test coverage >80%
- [ ] Zero regression bugs
- [ ] Page load time <2s
- [ ] PDF generation <3s

---

## 🎓 Next Steps

1. **Review this architecture** with team
2. **Approve database schema** changes
3. **Start Phase 1** implementation
4. **Weekly progress reviews**
5. **Launch incrementally** per document type

---

**Document Owner:** Development Team  
**Last Updated:** January 26, 2026  
**Status:** Proposal - Pending Approval
