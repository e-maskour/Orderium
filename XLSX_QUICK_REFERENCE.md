# Quick Reference: XLSX Import/Export

## 🎯 Quick Start

### Products
- **Export**: Click 📊 Export button on Products page
- **Import**: 
  1. Click 📥 Download Template
  2. Fill in Excel file 
  3. Click 📤 Import and select file

### Documents (Devis, Factures, Bons)
- **Export**: Click 📊 Export button on document page

## 📋 API Endpoints

### Products
```
GET  /api/products/export/xlsx
POST /api/products/import/xlsx (with file upload)
GET  /api/products/import/template
```

### Documents  
```
GET /api/quotes/export/xlsx?supplierId=0          # Devis vente
GET /api/quotes/export/xlsx?supplierId=1          # Demande prix
GET /api/invoices/export/xlsx?supplierId=0        # Factures vente
GET /api/invoices/export/xlsx?supplierId=1        # Factures achat
GET /api/orders/export/xlsx?supplierId=0          # Bons livraison
GET /api/orders/export/xlsx?supplierId=1          # Bons achat
```

## 📊 Excel Columns (Products)

**Required:**
- Nom (Product name)

**Optional:**
- Code, Description
- Prix de vente, Prix d'achat, Prix minimum
- Stock
- Taxe vente (%), Taxe achat (%)
- Est service (Oui/Non)
- Prix modifiable (Oui/Non)
- Unité vente, Unité achat
- Entrepôt
- Catégories (comma-separated)

## 🔄 Import Logic

- **Existing Code** → Updates product
- **No Code** → Creates new product
- **Missing Name** → Import fails

## 💡 Tips

1. Always download template first
2. Test with small batch
3. Use unique product codes
4. Match exact names for units/warehouses/categories
5. Check console for errors

## 🚀 Files Modified

**API:**
- `api/src/modules/products/products.service.ts`
- `api/src/modules/products/products.controller.ts`
- `api/src/modules/quotes/quotes.service.ts`
- `api/src/modules/invoices/invoices.service.ts`
- `api/src/modules/orders/orders.service.ts`

**Backoffice:**
- `backoffice/src/pages/Products.tsx`
- `backoffice/src/pages/documents/DocumentListPage.tsx`
- `backoffice/src/modules/*/[service].service.ts`

## ✅ Testing Checklist

- [ ] Download product template
- [ ] Import sample products
- [ ] Export products
- [ ] Export devis vente
- [ ] Export factures vente
- [ ] Export bons livraison
- [ ] Export demande prix (achat)
- [ ] Export factures achat  
- [ ] Export bons achat

---
**Ready to use!** 🎉
