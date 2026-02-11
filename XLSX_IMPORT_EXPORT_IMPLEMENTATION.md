# XLSX Import/Export Implementation Guide

## Overview
This document provides a complete overview of the XLSX import/export functionality implemented in Orderium for products and documents.

## Features Implemented

### 1. Products (Produits)
- ✅ **Export to XLSX**: Export all products with full details
- ✅ **Import from XLSX**: Import/update products from Excel file
- ✅ **Template Download**: Download a pre-formatted template for import

### 2. Documents
All document types support XLSX export:
- ✅ **Devis (Quotes)** - Sales quotes and purchase requests (demande de prix)
- ✅ **Factures (Invoices)** - Sales and purchase invoices
- ✅ **Bon de livraison (Delivery Notes)** - Delivery notes and purchase orders (bon d'achat)

## API Endpoints

### Products
```
GET  /api/products/export/xlsx           - Export all products
POST /api/products/import/xlsx           - Import products (multipart/form-data)
GET  /api/products/import/template       - Download import template
```

### Documents
```
GET  /api/quotes/export/xlsx?supplierId=  - Export quotes/demande de prix
GET  /api/invoices/export/xlsx?supplierId=  - Export invoices
GET  /api/orders/export/xlsx?supplierId=  - Export orders/bons
```

**Query Parameters:**
- `supplierId` (optional):
  - Omit for all documents
  - `0` or empty for sales documents (vente)
  - `> 0` for purchase documents (achat)

## Excel File Structure

### Products Template
The products XLSX file contains the following columns:

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| Code | Text | Product code | Optional |
| Nom | Text | Product name | **Required** |
| Description | Text | Product description | Optional |
| Prix de vente | Number | Sale price | Optional |
| Prix d'achat | Number | Purchase cost | Optional |
| Prix minimum | Number | Minimum price | Optional |
| Stock | Number | Stock quantity | Optional |
| Taxe vente (%) | Number | Sales tax percentage | Optional |
| Taxe achat (%) | Number | Purchase tax percentage | Optional |
| Est service | Text | Is service (Oui/Non) | Optional |
| Prix modifiable | Text | Price changeable (Oui/Non) | Optional |
| Unité vente | Text | Sales unit name | Optional |
| Unité achat | Text | Purchase unit name | Optional |
| Entrepôt | Text | Warehouse name | Optional |
| Catégories | Text | Categories (comma-separated) | Optional |

**Import Logic:**
- If a product with the same `Code` exists → **Update**
- If `Code` doesn't exist or is empty → **Create new**

### Documents Export Structure
Documents are exported with one row per line item:

**Common columns:**
- Numéro (Document number)
- Date
- Date échéance/expiration (Due/expiration date)
- Type (Document type)
- Client/Fournisseur (Partner name)
- Téléphone
- Adresse
- Statut
- Sous-total
- Remise (Discount)
- Type remise (Discount type: Montant/Pourcentage)
- Taxe
- Total
- Notes

**Line item columns:**
- Ligne (Line number)
- Code produit (Product code)
- Produit/Service (Description)
- Quantité (Quantity)
- Prix unitaire (Unit price)
- Remise ligne (Line discount)
- Type remise ligne (Line discount type)
- Taxe ligne (%) (Line tax percentage)
- Total ligne (Line total)

**Document-specific columns:**
- **Factures**: Montant payé, Montant restant
- **Bons de livraison**: Statut livraison, Du portail, Du client
- **Devis**: Date expiration

## Backoffice UI Integration

### Products Page
Located at: `/backoffice/src/pages/Products.tsx`

**New buttons added:**
1. 📥 **Download Template** - Downloads empty template
2. 📤 **Import** - Upload XLSX file to import products
3. 📊 **Export** - Export all products to XLSX

### Documents Pages
Located at: `/backoffice/src/pages/documents/DocumentListPage.tsx`

**New button added:**
- 📊 **Export** - Export documents to XLSX (next to "Nouveau" button)

## Usage Instructions

### For Products

#### Exporting Products
1. Navigate to Products page
2. Click the **Export** button (📊)
3. File downloads as `produits-YYYY-MM-DD.xlsx`

#### Importing Products
1. Click **Download Template** button to get the template
2. Fill in the Excel file with your product data
3. Click **Import** button
4. Select your filled Excel file
5. Wait for the import to complete
6. Check the success/error message:
   - Shows count of created, updated, and failed items
   - Errors are logged to browser console

#### Example Import Scenario
```
Code: PROD001 → Updates existing product with code PROD001
Code: (empty) → Creates new product
Nom: (empty) → Import fails for this row (required field)
```

### For Documents

#### Exporting Documents
1. Navigate to any document page:
   - Devis / Demande de prix
   - Factures vente / Factures achat
   - Bons de livraison / Bons d'achat
2. Click the **Export** button in the header
3. File downloads with appropriate name:
   - `devis-YYYY-MM-DD.xlsx`
   - `demandes-de-prix-YYYY-MM-DD.xlsx`
   - `factures-vente-YYYY-MM-DD.xlsx`
   - `factures-achat-YYYY-MM-DD.xlsx`
   - `bons-livraison-YYYY-MM-DD.xlsx`
   - `bons-achat-YYYY-MM-DD.xlsx`

## Technical Implementation

### Backend (API)

**Library Used:** `xlsx` (SheetJS)
```bash
npm install xlsx
```

**Key Files Modified:**
```
api/src/modules/products/
├── products.service.ts       # Added export/import methods
├── products.controller.ts    # Added export/import endpoints
├── products.module.ts        # Injected additional repositories
└── dto/import-result.dto.ts  # New DTO for import results

api/src/modules/quotes/
├── quotes.service.ts         # Added exportToXlsx method
└── quotes.controller.ts      # Added export endpoint

api/src/modules/invoices/
├── invoices.service.ts       # Added exportToXlsx method
└── invoices.controller.ts    # Added export endpoint

api/src/modules/orders/
├── orders.service.ts         # Added exportToXlsx method
└── orders.controller.ts      # Added export endpoint
```

### Frontend (Backoffice)

**Library Used:** `xlsx` (SheetJS)
```bash
npm install xlsx
```

**Key Files Modified:**
```
backoffice/src/pages/
├── Products.tsx                              # Added import/export UI

backoffice/src/pages/documents/
└── DocumentListPage.tsx                      # Added export button

backoffice/src/modules/products/
└── products.service.ts                       # Added export/import methods

backoffice/src/modules/quotes/
└── quotes.service.ts                         # Added exportToXlsx method

backoffice/src/modules/invoices/
└── invoices.service.ts                       # Added exportToXlsx method

backoffice/src/modules/orders/
└── orders.service.ts                         # Added exportToXlsx method
```

## Error Handling

### Product Import Errors
Import results include detailed error information:
```typescript
{
  success: boolean,
  imported: number,      // Count of new products created
  updated: number,       // Count of existing products updated
  failed: number,        // Count of failed imports
  errors: [              // Array of errors
    {
      row: number,       // Excel row number (1-indexed)
      error: string,     // Error message
      data?: any         // Row data that failed
    }
  ]
}
```

**Common errors:**
- Missing required field (Nom)
- Invalid unit of measure name
- Invalid warehouse name
- Invalid category name
- Invalid numeric values

### Export Errors
Errors are caught and displayed via toast notifications:
- API connection errors
- File generation errors
- Download errors

## Best Practices

### For Importing Products
1. **Always download the template first** to ensure correct format
2. **Test with a small batch** before importing large datasets
3. **Use unique product codes** for better update tracking
4. **Match exact names** for units, warehouses, and categories
5. **Check console for detailed errors** if import fails

### For Exporting
1. **Export regularly** as a backup
2. **Use exports for reporting** and analysis in Excel/Sheets
3. **Filter before export** if you need specific subsets (Note: Current implementation exports all, future enhancement could add filters)

## Future Enhancements

Potential improvements for future iterations:

1. **Import for Documents**: Add import functionality for documents (currently export-only)
2. **Filtered Export**: Export only filtered/visible items instead of all
3. **Batch Operations**: Export/import selections instead of all items
4. **Template Customization**: Allow users to customize export columns
5. **Scheduled Exports**: Automated daily/weekly exports
6. **Import Preview**: Show preview before confirming import
7. **Excel Validation**: Add data validation in template (dropdowns, number formats)
8. **Multi-language Support**: Template in multiple languages

## Troubleshooting

### Import Not Working
1. Check file format (must be .xlsx or .xls)
2. Verify required fields are filled
3. Check browser console for detailed errors
4. Ensure units/warehouses/categories exist in the system

### Export Downloads Empty File
1. Check if there's data to export
2. Verify API connection
3. Check browser download settings
4. Try a different browser

### Special Characters Issues
1. Ensure Excel file is saved as UTF-8
2. Use modern Excel versions (2016+)
3. Avoid special characters in codes

## Security Considerations

1. **File Size Limits**: API validates file size (default multer limits)
2. **File Type Validation**: Only .xlsx and .xls files accepted
3. **Authentication Required**: All endpoints require authentication
4. **Data Validation**: Server-side validation of all imported data
5. **No File Storage**: Uploaded files processed in memory only

## Performance Notes

- **Large Imports**: Products import processes sequentially (one-by-one)
- **Large Exports**: Documents may include many line items (one row per item)
- **Browser Memory**: Very large files (>10,000 rows) may cause browser slowdown
- **Recommended Batch Size**: Import products in batches of 500-1000 for best performance

## Support

For issues or questions:
1. Check browser console for detailed error messages
2. Verify API server is running and accessible
3. Test with template file first
4. Review this documentation for common issues

---

**Implementation Date:** February 8, 2026
**Version:** 1.0
**Status:** ✅ Complete and Ready for Use
