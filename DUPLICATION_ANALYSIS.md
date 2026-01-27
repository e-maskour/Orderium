# 🔍 Code Duplication Analysis

**Analysis Date:** January 26, 2026  
**Objective:** Identify and quantify code duplication in the current invoice/facture implementation

---

## 📊 Duplication Summary

### Current State

| Component/Page | Lines of Code | Duplicated Lines | Duplication % |
|---------------|---------------|------------------|---------------|
| **Frontend Pages** |
| FactureVente.tsx | 544 | ~520 | 95% |
| FactureAchat.tsx | 544 | ~520 | 95% |
| FactureVenteCreate.tsx | 58 | ~50 | 86% |
| FactureAchatCreate.tsx | 58 | ~50 | 86% |
| FactureVenteEdit.tsx | 290 | ~270 | 93% |
| FactureAchatEdit.tsx | 290 | ~270 | 93% |
| **Components** |
| FactureForm.tsx | 850 | N/A | Reusable but not optimal |
| FactureTable.tsx | 350 | N/A | Reusable but not optimal |
| **Backend** |
| invoices.service.ts | 650 | N/A | Single service (good) |
| **TOTAL** | **3,634 lines** | **~2,680 duplicated** | **~74%** |

---

## 🔴 Critical Duplication Points

### 1. **FactureVente.tsx vs FactureAchat.tsx**

**Differences (only 5% of code):**
```typescript
// Line 42 - Partner filtering
const salesInvoices = data.filter(inv => inv.invoice.customerId);  // Vente
const achatInvoices = data.filter(inv => inv.invoice.supplierId);  // Achat

// Line 58 - Partner label
partnerName: inv.invoice.customerName || 'Client inconnu',        // Vente
partnerName: inv.invoice.supplierName || 'Fournisseur inconnu',   // Achat

// Line 202 - Page title
title="Factures de Vente"                                          // Vente
title="Factures d'Achat"                                           // Achat

// Line 203 - Subtitle
subtitle="Gérez vos factures de vente"                            // Vente
subtitle="Gérez vos factures d'achat"                             // Achat

// Line 206 - Create route
onClick={() => navigate('/facture-vente/create')}                 // Vente
onClick={() => navigate('/facture-achat/create')}                 // Achat
```

**The other 520 lines are IDENTICAL:**
- Dashboard statistics calculation
- Chart rendering
- Recent invoices display
- Draft invoices section
- Unpaid invoices section
- Table rendering
- Modal management
- State management
- Event handlers
- API calls

---

### 2. **FactureVenteCreate.tsx vs FactureAchatCreate.tsx**

**Differences (only 14% of code):**
```typescript
// Line 3 - Import comment
// FactureVenteCreate
// FactureAchatCreate

// Line 9 - Function name
export default function FactureVenteCreate() {    // Vente
export default function FactureAchatCreate() {    // Achat

// Line 34 - Title
title="Nouvelle Facture de Vente"                // Vente
title="Nouvelle Facture d'Achat"                 // Achat

// Line 35 - Subtitle
subtitle="Créer une nouvelle facture client"    // Vente
subtitle="Créer une nouvelle facture fournisseur" // Achat

// Line 38 - Back route
onClick={() => navigate('/facture-vente')}       // Vente
onClick={() => navigate('/facture-achat')}       // Achat

// Line 47 - Form type
type="vente"                                     // Vente
type="achat"                                     // Achat
```

**The other 50 lines are IDENTICAL.**

---

### 3. **FactureVenteEdit.tsx vs FactureAchatEdit.tsx**

**Differences (only 7% of code):**
```typescript
// Similar pattern: only titles, routes, and type prop differ
// Everything else is duplicated: 
// - Loading states
// - Form rendering
// - Validation logic
// - Payment modal
// - Confirm dialogs
// - State management
```

---

## 🟡 Partial Duplication

### FactureForm.tsx - Room for Improvement

While `FactureForm.tsx` is reusable between Vente and Achat, it contains:

**Hardcoded Logic:**
```typescript
// Line 38-39 - Hardcoded labels
const isVente = type === 'vente';
const partnerLabel = isVente ? t('invoice.customer') : t('invoice.supplier');

// Line 273-281 - Repeated partner info display
{partnerPhone && (
  <p className="text-xs text-slate-600">
    <span className="font-medium">{t('invoice.phoneLabel')}</span> {partnerPhone}
  </p>
)}
// This pattern repeats 4-5 times
```

**Non-Configurable Features:**
- Tax rates hardcoded to [0%, 10%, 20%]
- Discount type limited to amount/percentage
- Items table columns fixed
- No support for expiration dates (needed for Devis)
- No signature field (needed for Bon de Livraison)
- Cannot disable tax column
- Cannot add custom fields per document type

**Size:** 850 lines - too large, should be broken into smaller components

---

### FactureTable.tsx - Room for Improvement

**Hardcoded Elements:**
```typescript
// Line 41 - Status color mapping (could be config)
const getStatusColor = (status: string) => {
  switch (status) {
    case 'paid': return 'bg-emerald-50...';
    // etc - 30 lines of switch statement
  }
}

// Line 61 - Status label mapping (could be config)
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'paid': return 'Payée';
    // etc - 20 lines of switch statement
  }
}
```

**Missing Features for Devis:**
- No "Convert to Invoice" action
- No expiration status
- No acceptance/rejection states

**Missing Features for Bon de Livraison:**
- No delivery status
- No signature indicator
- No linked invoice reference

---

## 📈 Impact Analysis

### Current Maintenance Cost

**Scenario:** Fix a bug in invoice validation

**Current Approach:**
1. Fix bug in FactureVente.tsx (30 min)
2. Copy fix to FactureAchat.tsx (5 min)
3. Test both pages separately (20 min)
4. Risk: Fix applied inconsistently
5. **Total Time:** 55 minutes

**With Unified Architecture:**
1. Fix bug in DocumentListPage.tsx (30 min)
2. Automatically applies to all document types
3. Test once (10 min)
4. **Total Time:** 40 minutes
5. **Time Saved:** 27% per bug fix

### New Feature Addition Cost

**Scenario:** Add PDF preview modal

**Current Approach:**
1. Add to FactureVente.tsx (60 min)
2. Add to FactureAchat.tsx (60 min)
3. Add to Devis.tsx when implemented (60 min)
4. Add to BonLivraison.tsx when implemented (60 min)
5. **Total Time:** 240 minutes (4 hours)

**With Unified Architecture:**
1. Add to DocumentPreviewModal.tsx (60 min)
2. Integrate into DocumentForm.tsx (30 min)
3. Automatically available to all types
4. **Total Time:** 90 minutes (1.5 hours)
5. **Time Saved:** 62.5%

---

## 🎯 Refactoring Opportunities

### High Priority (High Impact, Low Risk)

1. **Merge create pages** - Save ~50 lines per type
   - Before: FactureVenteCreate.tsx (58 lines) + FactureAchatCreate.tsx (58 lines)
   - After: One DocumentCreatePage.tsx (80 lines) + configs (20 lines)
   - **Savings:** 16 lines (14%)

2. **Merge list pages** - Save ~500 lines per type
   - Before: FactureVente.tsx (544 lines) + FactureAchat.tsx (544 lines)
   - After: One DocumentListPage.tsx (400 lines) + configs (50 lines)
   - **Savings:** 638 lines (59%)

3. **Merge edit pages** - Save ~270 lines per type
   - Before: FactureVenteEdit.tsx (290 lines) + FactureAchatEdit.tsx (290 lines)
   - After: One DocumentEditPage.tsx (300 lines) + configs (20 lines)
   - **Savings:** 260 lines (45%)

### Medium Priority (Medium Impact, Medium Risk)

4. **Break down FactureForm** - Improve maintainability
   - Extract DocumentItemsTable.tsx (300 lines)
   - Extract DocumentPartnerBox.tsx (100 lines)
   - Extract DocumentTotalsSection.tsx (80 lines)
   - Result: Better reusability and testability

5. **Enhance FactureTable** - Add extensibility
   - Make status colors configurable
   - Make actions conditional based on features
   - Add support for custom columns

### Low Priority (Nice to Have)

6. **Create DocumentDashboard** - Reusable statistics
   - Extract common dashboard logic
   - Make chart types configurable
   - Support custom statistics per type

---

## 🔢 Projected Savings

### Code Volume

| Scenario | Current | After Refactor | Reduction |
|----------|---------|----------------|-----------|
| **2 Document Types** (Facture V/A) | 2,634 lines | 1,200 lines | 54% |
| **4 Document Types** (+ Devis + BL) | 5,268 lines | 1,400 lines | 73% |
| **6 Document Types** (+ future) | 7,902 lines | 1,500 lines | 81% |

### Development Time

| Task | Current (2 types) | After Refactor | Savings |
|------|------------------|----------------|---------|
| **Bug Fix** | 55 min × 2 = 110 min | 40 min | 64% |
| **New Feature** | 240 min | 90 min | 62.5% |
| **New Document Type** | 580 min (build from scratch) | 60 min (configure) | 90% |
| **Test Coverage** | 4 test suites | 1 comprehensive suite | 75% |

---

## 🚨 Risk Assessment

### Risks of Current Duplication

1. **Inconsistency Risk:** HIGH
   - Bug fixes might not be applied to all types
   - Features might be implemented differently
   - UI/UX inconsistency across document types

2. **Maintenance Burden:** HIGH
   - Every change requires 2× work (Vente + Achat)
   - Scaling to 4-6 types = 4-6× work
   - Developer frustration and burnout

3. **Testing Complexity:** MEDIUM
   - Need to test same logic multiple times
   - Higher chance of regression
   - More edge cases to cover

4. **Onboarding Difficulty:** MEDIUM
   - New developers see duplicate code
   - Confusion about which file to modify
   - Longer ramp-up time

### Risks of Refactoring

1. **Migration Risk:** LOW-MEDIUM
   - Backward compatibility can be maintained
   - Incremental migration possible
   - Rollback strategy available

2. **Regression Risk:** MEDIUM
   - Comprehensive testing needed
   - Edge cases might be missed
   - Mitigation: Feature flags, gradual rollout

3. **Over-Engineering Risk:** LOW
   - Clear boundaries defined
   - Config-driven approach limits complexity
   - Strategy pattern allows type-specific logic

---

## ✅ Recommendations

### Immediate Actions (This Week)

1. ✅ **Create unified architecture document** - DONE
2. ✅ **Define shared component interfaces** - DONE
3. ⏳ **Get stakeholder buy-in** - PENDING
4. ⏳ **Plan Phase 1 sprint** - PENDING

### Short Term (Next 2 Weeks)

1. **Implement DocumentItemsTable**
   - Extract from FactureForm
   - Add tests
   - Use in both Vente and Achat

2. **Create DocumentListPage**
   - Refactor FactureVente to use it
   - Migrate FactureAchat to use it
   - A/B test with users

3. **Build DocumentCreatePage**
   - Merge create pages
   - Validate with QA

### Medium Term (Next Month)

1. Implement Devis using new architecture
2. Implement Bon de Livraison
3. Full migration completed
4. Remove old code

### Long Term (Next Quarter)

1. Add more document types (Proforma, Avoir, etc.)
2. Advanced features (bulk operations, templates)
3. API v2 with unified endpoints
4. Mobile app support

---

## 📝 Conclusion

**Current State:**
- 74% code duplication across invoice pages
- 2,680 lines of duplicated code
- High maintenance burden
- Scaling to 4-6 types will multiply problems

**Proposed Solution:**
- Unified document architecture
- 73-81% code reduction (depending on scale)
- 62-90% time savings on common tasks
- Future-proof for new document types

**Recommendation:** **PROCEED WITH REFACTORING**

The duplication is severe and will only worsen as new document types are added. The refactoring ROI is clear and achievable within 4-6 weeks.

---

**Prepared by:** Development Team  
**Reviewed by:** Technical Lead  
**Approved by:** Pending
