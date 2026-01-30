# CDN Image Management Strategy - Orderium

## Current State Analysis

### Existing Implementation
- **Storage**: Base64 encoded images stored as `imageUrl` text field in products table
- **Data Structure**: Single `imageUrl` nullable text column in Product entity
- **Limitations**:
  - Large database bloat from base64 encoding
  - Poor performance when fetching product lists
  - Difficult to resize/optimize images
  - No image versioning or caching
  - Limited scalability with growing product catalog

### Current Flow
```
Frontend (BO/Client) 
  → Uploads File (base64) 
  → API receives and stores 
  → Database stores full base64 string
  → Frontend retrieves and displays full base64
```

## Proposed Solution: Professional CDN Architecture

### Option 1: Cloudinary (Recommended for simplicity)
**Pros:**
- Easy integration with automatic optimization
- Built-in image transformations
- Free tier available
- URL-based delivery (no base64 bloat)
- CDN included
- Automatic responsive sizing

**Cons:**
- Dependency on external service
- May not work in isolated environments

### Option 2: AWS S3 + CloudFront
**Pros:**
- Full control over storage
- Can be self-hosted
- Highly scalable
- Integrates with your infrastructure

**Cons:**
- More complex setup
- Requires AWS management

### Option 3: MinIO (Self-hosted S3-compatible)
**Pros:**
- Self-hosted alternative to S3
- S3-compatible API
- Full control
- Great for restricted environments

**Cons:**
- Infrastructure management required

## Recommended Implementation: Hybrid Approach

We'll implement a **service abstraction layer** that supports multiple CDN providers, making it easy to switch between them.

### New Architecture
```
Frontend (BO/Client)
  ↓ (Upload request with file)
API - Image Upload Service (abstraction)
  |-→ Cloudinary Provider (production)
  |-→ AWS S3 Provider (optional)
  |-→ Local File System Provider (development)
  ↓ (Returns CDN URL)
Database (stores URL only, not image data)
  ↓ (URL is served to frontend)
Frontend displays optimized CDN image
```

## Implementation Plan

### Phase 1: Backend Implementation

#### 1. Create Image Storage Service
- Abstraction layer for multiple providers
- Interfaces for upload, delete, transform operations
- Configuration management

#### 2. Add Upload Endpoint
- `POST /products/:id/image` - Upload product image
- `DELETE /products/:id/image` - Remove product image
- Validation and error handling

#### 3. Update Product Entity
- Add `imageUrl` field to store CDN URL (already exists)
- Add `imagePublicId` field to store CDN identifier for deletion
- Add metadata fields (size, type, uploadedAt)

#### 4. Update DTOs
- `UploadProductImageDto` - File upload
- `ProductImageResponseDto` - Image metadata response
- Update `ProductResponseDto` to include image metadata

### Phase 2: Frontend Implementation (Backoffice)

#### 1. Create Image Upload Component
- File input with validation
- Preview before upload
- Progress indicator
- Error handling

#### 2. Update Product Create/Edit Forms
- Add image upload field
- Display image preview
- Handle image replacement
- Show CDN URL in readonly field

#### 3. Update Product Display
- Load images from CDN URL
- Implement lazy loading
- Handle broken images gracefully

### Phase 3: Configuration & Migration

#### 1. Environment Configuration
- Add provider selection (CLOUDINARY, AWS_S3, MINIO, LOCAL)
- Provider-specific credentials
- CDN URL configuration
- Image optimization settings

#### 2. Data Migration
- Script to convert existing base64 to CDN
- Batch upload to selected CDN
- Update database with new URLs
- Rollback capability

## Benefits

1. **Performance**
   - Smaller database queries
   - Faster image loading via CDN
   - Automatic caching

2. **Scalability**
   - No database bloat
   - Easy to add more images
   - Load balancing via CDN

3. **Flexibility**
   - Easy to switch providers
   - Support multiple formats
   - Image optimization on-the-fly

4. **Cost Optimization**
   - Less database storage
   - Better bandwidth utilization
   - Free hosting options available

## Technology Stack

### Backend (NestJS)
- `@nestjs/common` - Core framework
- `multer` - File upload handling
- `cloudinary` or `aws-sdk` - CDN clients
- `class-validator` - File validation

### Frontend (React)
- `react-dropzone` or HTML5 File API
- `react-query` - Upload state management
- `react-fast-compare` - Optimization

### Configuration
- Environment variables
- Factory pattern for provider selection
- Dependency injection

## File Structure

```
api/src/modules/
├── images/ (new module)
│   ├── controllers/
│   │   └── images.controller.ts
│   ├── services/
│   │   ├── image.service.ts (main service)
│   │   ├── providers/
│   │   │   ├── cloudinary.provider.ts
│   │   │   ├── s3.provider.ts
│   │   │   └── local.provider.ts
│   │   └── image-storage.interface.ts
│   ├── dto/
│   │   ├── upload-image.dto.ts
│   │   └── image-response.dto.ts
│   ├── entities/
│   │   └── image.entity.ts (optional)
│   └── images.module.ts
├── products/
│   ├── entities/
│   │   └── product.entity.ts (updated)
│   ├── dto/
│   │   ├── product-image.dto.ts (new)
│   │   ├── upload-product-image.dto.ts (new)
│   │   └── product-response.dto.ts (updated)
│   ├── controllers/
│   │   └── products.controller.ts (updated)
│   └── services/
│       └── products.service.ts (updated)
```

## Migration Path

### Before Implementation
- Review all product images currently using base64
- Assess database size impact
- Plan CDN provider choice

### During Implementation
1. Deploy backend image service (backward compatible)
2. Deploy frontend upload component
3. Run migration script (non-destructive)
4. Test image loading from CDN
5. Remove base64 images from database

### Rollback Plan
- Keep old imageUrl field for 2-3 versions
- Store CDN URL in separate field initially
- Database backup before migration

## Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Service Layer + Upload Endpoint | 2-3 days | High |
| Frontend Image Upload | 2-3 days | High |
| Configuration & Setup | 1 day | Medium |
| Migration Script | 1-2 days | Medium |
| Testing & QA | 2-3 days | High |

## Next Steps

1. Choose CDN provider based on requirements
2. Set up provider account and credentials
3. Implement backend service layer
4. Add upload endpoints
5. Update frontend components
6. Test end-to-end file uploads
7. Run data migration
8. Monitor and optimize
