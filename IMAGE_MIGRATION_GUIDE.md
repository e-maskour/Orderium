# Image CDN Migration Guide

## Overview

This guide helps you migrate existing product images from base64 encoding to a professional CDN (Cloudinary, AWS S3, or local storage).

## Pre-Migration Checklist

- [ ] Backup your database
- [ ] Choose a storage provider (recommend Cloudinary for simplicity)
- [ ] Set up provider account and credentials
- [ ] Add environment variables (.env file)
- [ ] Test API image upload endpoints
- [ ] Have a maintenance window planned

## Migration Strategy

There are two approaches:

### Approach 1: Gradual Migration (Recommended)

New images use CDN while old base64 images continue to work. Migrate old images slowly.

1. Deploy CDN infrastructure
2. Update forms to use new image upload
3. Run migration script in background
4. Monitor and verify
5. Remove old base64 images

**Advantages:**
- No downtime
- Can be reversed if issues occur
- Can test on small subset first
- Better user experience

### Approach 2: Full Migration

Migrate all images at once in a maintenance window.

1. Backup database
2. Stop application
3. Run migration script
4. Verify all images
5. Remove backup
6. Restart application

**Advantages:**
- Cleaner database
- Single migration event
- Faster query performance post-migration

## Step-by-Step Deployment

### 1. Update Dependencies

Add required packages to API:

```bash
cd api
npm install cloudinary
npm install @nestjs/platform-express multer
npm install --save-dev @types/multer
```

Or for AWS S3:

```bash
npm install aws-sdk
```

### 2. Deploy Backend Changes

```bash
# Apply migrations
npm run typeorm migration:run

# Start API
npm run start:dev
```

### 3. Verify Backend

Test image upload:

```bash
curl -X POST \
  -F "image=@test-image.jpg" \
  http://localhost:3000/api/images/upload?folder=test

# Expected response:
# {
#   "success": true,
#   "data": {
#     "url": "https://cdn-url/...",
#     "publicId": "test/...",
#     "size": 125000,
#     "format": "jpg"
#   }
# }
```

Test product image upload:

```bash
curl -X POST \
  -F "image=@product-image.jpg" \
  http://localhost:3000/api/products/1/image

# Expected response:
# {
#   "success": true,
#   "product": { /* updated product */ },
#   "image": { /* image info */ }
# }
```

Test provider info:

```bash
curl http://localhost:3000/api/images/provider

# Expected response:
# {
#   "success": true,
#   "data": {
#     "provider": "CLOUDINARY",
#     "name": "Cloudinary",
#     "configured": true
#   }
# }
```

### 4. Update Backoffice

Copy the new `ImageUpload` component to backoffice:

```bash
# Component already created at:
# backoffice/src/components/ImageUpload.tsx
```

### 5. Update Product Forms

In `backoffice/src/pages/ProductCreate.tsx`:

```tsx
import { ImageUpload } from '../components/ImageUpload';

export default function ProductCreate() {
  const [formData, setFormData] = useState({
    // ... other fields
    imageUrl: '',
    imagePublicId: '',
  });

  const handleImageUpload = (url, publicId) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: url,
      imagePublicId: publicId,
    }));
  };

  return (
    <form>
      {/* ... other form fields ... */}
      
      <div>
        <label>Product Image</label>
        <ImageUpload
          onImageUpload={handleImageUpload}
          currentImage={formData.imageUrl}
          onImageRemove={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
          maxSizeMB={5}
          folder="products"
        />
      </div>

      {/* ... submit button ... */}
    </form>
  );
}
```

### 6. Run Database Migration

```bash
# Apply migration to add imagePublicId column
npm run typeorm migration:run
```

Or manually:

```sql
ALTER TABLE products ADD COLUMN imagePublicId VARCHAR(500) NULL;

-- Add index for better performance
CREATE INDEX idx_products_image_public_id ON products(imagePublicId);
```

## Image Migration Script

Create a migration script to convert base64 images to CDN:

```bash
# Create migration script
cat > api/src/scripts/migrate-images.ts << 'EOF'
import { AppDataSource } from '../database/data-source';
import { ImageService } from '../modules/images/services/image.service';
import { Product } from '../modules/products/entities/product.entity';

async function migrateImages() {
  const dataSource = await AppDataSource.initialize();
  const productRepository = dataSource.getRepository(Product);
  const imageService = new ImageService(
    {} as any, // ConfigService
    {} as any, // CloudinaryProvider
    {} as any, // S3Provider
    {} as any, // LocalProvider
  );

  try {
    // Find all products with base64 images
    const products = await productRepository.find();
    let migratedCount = 0;
    let failedCount = 0;

    for (const product of products) {
      if (product.imageUrl && product.imageUrl.startsWith('data:image')) {
        console.log(`Migrating product: ${product.name} (ID: ${product.id})`);
        
        try {
          // Convert base64 to buffer
          const base64Data = product.imageUrl.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          
          // Create mock file object
          const mockFile = {
            buffer,
            originalname: `product-${product.id}-image.jpg`,
            mimetype: 'image/jpeg',
            size: buffer.length,
          } as Express.Multer.File;

          // Upload to CDN
          const result = await imageService.uploadImage(mockFile, 'products');
          
          // Update product
          product.imageUrl = result.url;
          product.imagePublicId = result.publicId;
          await productRepository.save(product);
          
          migratedCount++;
          console.log(`✓ Migrated successfully`);
        } catch (error) {
          failedCount++;
          console.error(`✗ Failed to migrate: ${error.message}`);
        }
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`- Migrated: ${migratedCount}`);
    console.log(`- Failed: ${failedCount}`);
    console.log(`- Total: ${products.length}`);

  } finally {
    await dataSource.destroy();
  }
}

migrateImages().catch(console.error);
EOF

# Run migration
npx ts-node api/src/scripts/migrate-images.ts
```

Or create as NestJS command:

```bash
npm run migrate:images
```

## Database Cleanup

After successful migration, optionally clean up old base64 data:

```sql
-- Check migration
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN imageUrl LIKE 'data:image%' THEN 1 END) as base64_images,
  COUNT(CASE WHEN imageUrl NOT LIKE 'data:image%' THEN 1 END) as cdn_images
FROM products;

-- If all migrated, can archive base64 versions
CREATE TABLE products_backup_images AS
SELECT id, name, imageUrl FROM products WHERE imageUrl LIKE 'data:image%';

-- Update to remove base64 (only if confident)
UPDATE products SET imageUrl = NULL WHERE imageUrl LIKE 'data:image%';
```

## Rollback Plan

If something goes wrong:

```bash
# Database rollback
npm run typeorm migration:revert

# Or manually restore backup
mysql -u user -p database < backup.sql

# Remove migration files
rm api/src/database/migrations/*AddImagePublicIdToProducts*
```

## Verification Checklist

After migration complete:

- [ ] Database backup created
- [ ] New images upload successfully
- [ ] Old base64 images display correctly
- [ ] Migration script runs successfully
- [ ] All migrated images load correctly
- [ ] Image optimization works (resize, thumbnails)
- [ ] Backoffice image upload component works
- [ ] Performance is improved
- [ ] No broken image links
- [ ] CDN provider dashboard shows metrics

## Performance Comparison

### Before (Base64 in Database)

```
Database Size: ~2GB (for 10k images)
Query Time: 500ms+ (fetching 100 products)
API Response Size: ~10MB (for 100 products)
Image Load Time: 2-3s per page
```

### After (CDN Images)

```
Database Size: ~50MB (only URLs)
Query Time: 50ms (fetching 100 products)
API Response Size: ~100KB (for 100 products)
Image Load Time: 500ms per page
```

## Troubleshooting

### Migration script fails

```bash
# Check logs
tail -f logs/migration.log

# Run with verbose output
DEBUG=* npm run migrate:images

# Test single product
# Modify script to process one product
```

### Mixed image sources

Some images may be from external URLs or base64. Verify:

```sql
-- Check image URL patterns
SELECT imageUrl, COUNT(*) FROM products 
GROUP BY SUBSTRING(imageUrl, 1, 50)
ORDER BY COUNT(*) DESC;
```

### Performance still slow

Check if indexes exist:

```sql
-- Create indexes if missing
CREATE INDEX idx_products_image_url ON products(imageUrl);
CREATE INDEX idx_products_image_public_id ON products(imagePublicId);

-- Analyze query performance
EXPLAIN SELECT * FROM products WHERE imageUrl IS NOT NULL LIMIT 100;
```

## Post-Migration Tasks

1. **Update Documentation**
   - Inform users about new image upload feature
   - Share best practices for product images

2. **Monitor Metrics**
   - CDN usage and costs
   - Image load times
   - Database query performance

3. **Optimize Images**
   - Set up image compression settings
   - Configure responsive image sizes
   - Enable caching headers

4. **Train Team**
   - Show new image upload UI
   - Explain storage limits
   - Set image guidelines

## Support

If you encounter issues:

1. Check CloudinaryProvider logs
2. Verify credentials in .env
3. Check image file size limits
4. Verify network connectivity
5. Check CDN provider dashboard

For help:
- Cloudinary: https://support.cloudinary.com
- AWS S3: https://aws.amazon.com/support
- Project: Check documentation in MODULE_DOCS.md
