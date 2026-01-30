# Product Edit Form - Redesigned Layout

## New Basic Information Layout

### Visual Structure
```
┌─────────────────────────────────────────────────────────────┐
│ BASIC INFORMATION                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌─────────────────────────────────┐  │
│  │              │    │ Product Name                     │  │
│  │   Product    │    │ [________________]               │  │
│  │   Image      │    │                                 │  │
│  │   (Square)   │    ├─────────────────────────────────┤  │
│  │   h: 256px   │    │ Product Code (EAN-13)           │  │
│  │   w: auto    │    │ [________________]               │  │
│  │              │    │                                 │  │
│  │              │    │ > Generate new code             │  │
│  └──────────────┘    └─────────────────────────────────┘  │
│                                                             │
│  Column 1           Column 2 (spans 2 columns)           │
│  (33% width)        (67% width)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐ ┌─────────────────────────┐   │
│  │ Warehouse               │ │ Categories              │   │
│  │ [________________]       │ │ [________________]       │   │
│  └─────────────────────────┘ └─────────────────────────┘   │
│                                                             │
│  Grid 2 columns (50% / 50%)                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Description                                          │   │
│  │ [____________________________________________________│   │
│  │ ____________________________________________________]   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  Full width                                              │
└─────────────────────────────────────────────────────────────┘
```

## Changes Made

### Layout Structure (Grid System)
```
Before:
Grid 2-cols: Name | Code
Grid 2-cols: Warehouse | Categories
Full-width: Description

After:
Grid 3-cols: Image (col 1) | Name/Code (col 2-3)
  - Image: Square card, 256px height
  - Name/Code: Stacked vertically in one column (col 2-3)
Grid 2-cols: Warehouse | Categories (unchanged)
Full-width: Description (unchanged)
```

### Image Display
- **Location**: Top-left in Basic Information section
- **Size**: Square (256px height)
- **Style**: Rounded borders, light background
- **Content**: 
  - Shows current product image if available
  - Shows placeholder icon if no image (ImageIcon from lucide-react)
- **Function**: Preview only (no upload here)

### Form Fields
1. **Product Image** (Square card, left side, 2 rows height)
   - Current image preview
   - No image placeholder
   - Read-only display

2. **Product Name** (Right side, row 1)
   - Input field (full width of right column)
   - Required field indicator

3. **Product Code/EAN-13** (Right side, row 2)
   - Input field (full width of right column)
   - Validation error display
   - Help text
   - Regenerate button

### Responsive Behavior
- **Desktop (3+ columns available)**: Image left, name/code right (as shown above)
- **Maintenance**: All elements maintain proper spacing with `gap-6` utility

## Color & Styling
- Image card background: `bg-slate-100`
- Image card border: `border border-slate-200`
- Border radius: `rounded-lg`
- When no image: Placeholder icon (`ImageIcon`) in slate-300
- Text color for placeholder: `text-slate-400`

## Code Changes

### File Modified
`backoffice/src/pages/ProductDetail.tsx`

### Key Changes
1. Added import for ImageIcon from lucide-react
2. Changed from `grid-cols-2` to `grid-cols-3` for name/code layout
3. Created image preview card in first column:
   ```tsx
   <div className="col-span-1">
     <div className="relative w-full h-64 bg-slate-100 rounded-lg...">
       {product?.imageUrl ? (
         <img src={...} alt="Product" className="w-full h-full object-cover" />
       ) : (
         <div className="w-full h-full flex items-center justify-center">
           <ImageIcon className="w-12 h-12 text-slate-300..." />
           <p className="text-sm text-slate-400">No image</p>
         </div>
       )}
     </div>
   </div>
   ```

4. Wrapped name & code in `col-span-2` on right:
   ```tsx
   <div className="col-span-2">
     <div className="space-y-4">
       {/* Name field */}
       {/* Code field */}
     </div>
   </div>
   ```

## Image Upload Section
- **Location**: Still below Description (unchanged)
- **Component**: ImageUpload component (drag-drop, upload, preview, remove)
- **Purpose**: Upload, edit, or remove product images
- **Connected**: Auto-refreshes product detail when image changes

## UX Flow for Image Management

### View/Edit Product
1. Open ProductDetail page for existing product
2. See product image preview in top-left basic info card
3. Scroll down to "Product Image" section
4. Upload/change/remove image using ImageUpload component
5. Page auto-refreshes and shows new image in preview card

### Create New Product
1. ProductCreate page doesn't have image upload
2. Create product first (redirect to detail page)
3. Go to ProductDetail page
4. Upload image from "Product Image" section
5. View preview in basic info card

## Benefits of New Layout
✅ **Professional appearance**: Image prominently displayed
✅ **Better space utilization**: Image and key fields visible at once
✅ **Improved UX**: No need to scroll to see both image and product details
✅ **Consistent branding**: Matches modern product management interfaces
✅ **Clear visual hierarchy**: Image draws attention, text fields organized below

## Testing Checklist
- [ ] ProductDetail page loads correctly
- [ ] Image preview displays for products with images
- [ ] Placeholder shows for products without images
- [ ] Field layout is correct (image left, name/code right)
- [ ] Name and code fields are editable
- [ ] Fields below (Warehouse, Categories) display correctly
- [ ] ImageUpload section still works (below description)
- [ ] Image changes reflect in preview card immediately

## Future Enhancements
- Click image card to open full-resolution view
- Click image card to quickly open upload dialog
- Drag-drop image directly on preview card
- Quick image actions (remove, optimize) on hover
- Image gallery if supporting multiple images
