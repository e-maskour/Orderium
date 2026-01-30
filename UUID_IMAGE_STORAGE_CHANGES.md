# UUID-Based Image Storage Implementation

## Overview
Updated image storage system to use UUID-based references instead of real filenames, with frontend URL construction for proper API integration.

## Problem Statement
**Before:**
- API saved full URL: `http://localhost:3000/uploads/images/products/1769725243473-r4g52l-milka-chocolate-with-hazelnuts-90-g-1522588-en.webp`
- Database stored absolute URLs
- Tight coupling between API and frontend URL construction

**After:**
- API saves relative path with UUID: `products/550e8400-e29b-41d4-a716-446655440000.webp`
- Database stores only the reference, not the full URL
- Frontend constructs full URL by concatenating API base URL
- Decoupled storage from presentation

## Changes Made

### 1. API - Local Provider (`api/src/modules/images/providers/local.provider.ts`)
```typescript
// Added UUID import
import { v4 as uuidv4 } from 'uuid';

// Changed filename generation
const uuid = uuidv4();
const fileExtension = path.extname(file.originalname);
const fileName = `${uuid}${fileExtension}`;

// Return only relative path (NOT full URL)
return {
  url: relativePath,  // e.g., "products/550e8400-e29b-41d4-a716-446655440000.webp"
  publicId: relativePath,
  size: file.size,
  format: fileExtension.substring(1),
};
```

**Changes:**
- ✅ Generate UUID instead of using filename or timestamp
- ✅ Return relative path instead of full URL
- ✅ Preserve file extension from original
- ✅ Keep folder structure: `products/uuid.ext`

### 2. API - Cloudinary Provider (`api/src/modules/images/providers/cloudinary.provider.ts`)
```typescript
// Changed response to return public_id (reference) instead of full URL
return {
  url: result.public_id,        // e.g., "orderium/products/550e8400..."
  secureUrl: result.secure_url, // Keep for internal use if needed
  publicId: result.public_id,
  size: result.bytes,
  format: result.format,
};
```

**Changes:**
- ✅ Return Cloudinary public_id as reference
- ✅ Keep full URL in secureUrl for internal use
- ✅ Frontend handles URL construction for Cloudinary

### 3. API - S3 Provider (`api/src/modules/images/providers/s3.provider.ts`)
```typescript
// Added UUID import
import { v4 as uuidv4 } from 'uuid';

// Changed key generation
const uuid = uuidv4();
const fileExtension = path.extname(file.originalname);
const key = `${folder}/${uuid}${fileExtension}`;

// Return only the key (NOT the full Location URL)
return {
  url: key,  // e.g., "products/550e8400-e29b-41d4-a716-446655440000.webp"
  publicId: key,
  size: file.size,
  format: fileExtension.substring(1),
};
```

**Changes:**
- ✅ Use UUID for S3 object key
- ✅ Return S3 key instead of full Location URL
- ✅ Consistent with Local provider format

### 4. API - Main Server (`api/src/main.ts`)
```typescript
// Added imports for static file serving
import * as express from 'express';
import * as path from 'path';

// Added static file serving middleware
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));
```

**Changes:**
- ✅ Serve `uploads` directory as static files
- ✅ Enables local images to be accessible via HTTP
- ✅ URL format: `http://localhost:3000/uploads/images/products/uuid.ext`

### 5. Frontend - ImageUpload Component (`backoffice/src/components/ImageUpload.tsx`)
```typescript
// Construct full URL from relative path
const relativePath = imageData.url;
const apiBaseUrl = window.location.origin;

let fullImageUrl: string;
if (relativePath.startsWith('http')) {
  fullImageUrl = relativePath;
} else if (relativePath.startsWith('orderium/')) {
  // Cloudinary
  fullImageUrl = `https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/${relativePath}`;
} else {
  // LOCAL or S3
  fullImageUrl = `${apiBaseUrl}/uploads/images/${relativePath}`;
}

onImageUpload(fullImageUrl, imagePublicId);
```

**Changes:**
- ✅ Extract relative path from API response
- ✅ Detect storage provider by path format
- ✅ Construct appropriate full URL for each provider
- ✅ Pass full URL to parent component

## Database Schema

### Product Entity (`api/src/modules/products/entities/product.entity.ts`)
```typescript
@Column({ type: 'varchar', length: 500, nullable: true })
imageUrl: string;  // Stores relative path or reference
                   // Examples:
                   // "products/550e8400-e29b-41d4-a716-446655440000.webp"
                   // "orderium/products/550e8400-e29b-41d4-a716-446655440000"

@Column({ type: 'varchar', length: 500, nullable: true })
imagePublicId: string; // Same as imageUrl for reference
```

## URL Construction Examples

### Local Provider
```
Storage: ./uploads/images/products/550e8400-e29b-41d4-a716-446655440000.webp
Database: "products/550e8400-e29b-41d4-a716-446655440000.webp"
Frontend URL: "http://localhost:3000/uploads/images/products/550e8400-e29b-41d4-a716-446655440000.webp"
```

### Cloudinary Provider
```
Storage: Cloudinary
Database: "orderium/products/550e8400-e29b-41d4-a716-446655440000"
Frontend URL: "https://res.cloudinary.com/your_cloud_name/image/upload/orderium/products/550e8400-e29b-41d4-a716-446655440000"
```

### AWS S3 Provider
```
Storage: AWS S3 (orderium-bucket)
Database: "products/550e8400-e29b-41d4-a716-446655440000.webp"
Frontend URL: "http://localhost:3000/uploads/images/products/550e8400-e29b-41d4-a716-446655440000.webp"
```

## API Response Format

### Before Changes
```json
{
  "image": {
    "url": "http://localhost:3000/uploads/images/products/1769725243473-r4g52l-milka-chocolate-with-hazelnuts-90-g-1522588-en.webp",
    "publicId": "products/1769725243473-r4g52l-milka-chocolate-with-hazelnuts-90-g-1522588-en.webp",
    "size": 245000,
    "format": "webp"
  }
}
```

### After Changes
```json
{
  "image": {
    "url": "products/550e8400-e29b-41d4-a716-446655440000.webp",
    "publicId": "products/550e8400-e29b-41d4-a716-446655440000.webp",
    "size": 245000,
    "format": "webp"
  }
}
```

## Benefits

1. **Privacy & Security**
   - ✅ Hides real filenames
   - ✅ Prevents enumeration attacks
   - ✅ Cleaner URLs

2. **Database Efficiency**
   - ✅ Shorter storage paths
   - ✅ Consistent format across providers
   - ✅ Easier to migrate between providers

3. **Flexibility**
   - ✅ URLs built on-the-fly (changes don't require DB migration)
   - ✅ Easy to change API base URL without DB updates
   - ✅ Support for CDN/proxy modifications

4. **Maintainability**
   - ✅ Single source of truth for URLs (frontend logic)
   - ✅ Easy to add new storage providers
   - ✅ Decoupled storage from presentation

## Testing Checklist

- [ ] Start API: `npm run start:dev`
- [ ] Create new product
- [ ] Upload image (LOCAL provider)
- [ ] Verify image displays correctly in ProductDetail
- [ ] Check database: `imageUrl` contains only relative path (e.g., `products/uuid.webp`)
- [ ] Refresh page - image still displays
- [ ] Remove image - deletion works
- [ ] Test with Cloudinary provider (if configured)
- [ ] Test with S3 provider (if configured)

## Configuration Files

### No changes needed to `.env`
```bash
STORAGE_PROVIDER=LOCAL  # Keep as is (LOCAL, CLOUDINARY, or AWS_S3)
LOCAL_UPLOAD_DIR=./uploads/images
LOCAL_BASE_URL=http://localhost:3000/uploads/images
```

## Migration Notes

### For Existing Images (if any)
If there are existing products with full URLs in the database:

```sql
-- Example migration to clean up URLs
UPDATE products 
SET imageUrl = REGEXP_SUBSTR(imageUrl, 'products/.*')
WHERE imageUrl LIKE 'http://localhost%';
```

## Rollback Impact
If reverting these changes:
1. Frontend will receive relative paths but won't construct URLs
2. Images won't display until URL construction is fixed
3. No database schema changes (URLs are just different format)

## Files Modified

| File | Changes | Type |
|------|---------|------|
| `api/src/modules/images/providers/local.provider.ts` | UUID generation, relative path return | Provider |
| `api/src/modules/images/providers/cloudinary.provider.ts` | Return public_id instead of URL | Provider |
| `api/src/modules/images/providers/s3.provider.ts` | UUID generation, relative path return | Provider |
| `api/src/main.ts` | Static file serving setup | Configuration |
| `backoffice/src/components/ImageUpload.tsx` | URL construction logic | Frontend |

## Future Enhancements

1. **Add image service endpoint** for getting proper URLs
   ```typescript
   GET /api/images/url/:reference => returns full URL
   ```

2. **CDN integration**
   - Support CloudFront, Bunny CDN, etc.
   - Automatic CDN URL construction

3. **Image optimization**
   - Automatic resizing on upload
   - Format conversion (WebP, AVIF)
   - Progressive loading

4. **Image management**
   - Bulk operations
   - Image galleries
   - Metadata extraction

---

## Deployment Checklist

Before going to production:
- [ ] Test all three storage providers
- [ ] Verify static file serving works
- [ ] Update frontend to use production API URL
- [ ] Test image uploads end-to-end
- [ ] Verify database stores relative paths
- [ ] Check CORS is properly configured
- [ ] Monitor upload directory size
- [ ] Set up image cleanup/rotation policy
