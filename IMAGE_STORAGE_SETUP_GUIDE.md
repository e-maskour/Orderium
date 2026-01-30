# Orderium - Image Storage Configuration Guide

## Quick Start

### 1. Local Development (Recommended for testing)

```bash
# Copy to your .env file
STORAGE_PROVIDER=LOCAL
LOCAL_UPLOAD_DIR=./uploads/images
LOCAL_BASE_URL=http://localhost:3000/uploads/images
```

Then create the uploads directory:
```bash
mkdir -p ./uploads/images
```

### 2. Cloudinary (Production - Easiest Setup)

1. **Create Cloudinary Account:**
   - Go to https://cloudinary.com
   - Click "Sign Up For Free"
   - Complete registration

2. **Get Your Credentials:**
   - Go to Dashboard → Account Settings → API Keys
   - Copy: Cloud Name, API Key, API Secret

3. **Add to .env:**
   ```bash
   STORAGE_PROVIDER=CLOUDINARY
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Features Included:**
   - Automatic image optimization
   - Responsive image delivery
   - CDN worldwide
   - Free tier: 25 credits/month (~500MB)
   - Transformation API for resizing, cropping, etc.

### 3. AWS S3 (Production - Full Control)

1. **Create AWS Account:**
   - Go to https://aws.amazon.com
   - Create an account

2. **Create S3 Bucket:**
   - Go to S3 service
   - Click "Create bucket"
   - Name: `orderium-images` (or your preference)
   - Choose region (e.g., `us-east-1`)
   - Block public access: Uncheck all (to serve publicly)
   - Create

3. **Create IAM User with S3 Access:**
   - Go to IAM service
   - Create user: `orderium-api`
   - Attach policy: `AmazonS3FullAccess`
   - Create access key → CLI
   - Save Access Key ID and Secret Access Key

4. **Add to .env:**
   ```bash
   STORAGE_PROVIDER=AWS_S3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=orderium-images
   ```

5. **Configure S3 Bucket for Public Access:**
   - Select bucket → Permissions → Bucket Policy
   - Paste this policy:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicRead",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::orderium-images/*"
       }
     ]
   }
   ```

### 4. MinIO (Self-Hosted S3 Alternative)

1. **Install MinIO:**
   ```bash
   docker run -d \
     --name minio \
     -p 9000:9000 \
     -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio:latest \
     server /data --console-address ":9001"
   ```

2. **Create Bucket:**
   - Go to http://localhost:9001
   - Login: minioadmin / minioadmin
   - Create bucket: `orderium-images`

3. **Create Service Account:**
   - Go to Service Accounts → Create
   - Policy: Attach full access to bucket
   - Save credentials

4. **Add to .env:**
   ```bash
   STORAGE_PROVIDER=AWS_S3
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_service_account_key
   AWS_SECRET_ACCESS_KEY=your_service_account_secret
   AWS_S3_BUCKET=orderium-images
   AWS_S3_ENDPOINT=http://localhost:9000
   AWS_S3_FORCE_PATH_STYLE=true
   ```

## Comparison

| Feature | Local | Cloudinary | AWS S3 | MinIO |
|---------|-------|-----------|--------|-------|
| Setup Difficulty | ⭐ Easy | ⭐⭐ Medium | ⭐⭐⭐ Hard | ⭐⭐ Medium |
| Cost | Free | Free tier included | Pay-as-you-go | Self-hosted |
| Performance | Local | CDN worldwide | CDN worldwide | Local |
| Image Optimization | Manual | Automatic | Optional | Manual |
| Transformation API | No | Yes | No | No |
| Best For | Development | Production | Large scale | Private/Restricted |
| Support | Community | Vendor | Vendor | Community |

## API Endpoints

### Upload Image to Products

```bash
curl -X POST \
  -F "image=@/path/to/image.jpg" \
  http://localhost:3000/api/products/{productId}/image
```

**Response:**
```json
{
  "success": true,
  "product": { /* updated product */ },
  "image": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "orderium/products/...",
    "size": 125000,
    "format": "jpg",
    "width": 1920,
    "height": 1080,
    "thumbnailUrl": "https://res.cloudinary.com/.../c_fill,w_300,h_300/..."
  }
}
```

### Delete Product Image

```bash
curl -X DELETE \
  http://localhost:3000/api/products/{productId}/image
```

### Get Optimized Image URL

```bash
curl -X GET \
  "http://localhost:3000/api/products/{productId}/image/optimize?width=300&height=300"
```

## Frontend Usage

### Using Image Upload Component

```tsx
import { ImageUpload } from '@/components/ImageUpload';

function ProductForm() {
  const handleImageUpload = (url, publicId) => {
    // Update form with new image URL
    setFormData(prev => ({
      ...prev,
      imageUrl: url,
      imagePublicId: publicId
    }));
  };

  return (
    <ImageUpload
      productId={productId}
      onImageUpload={handleImageUpload}
      currentImage={product?.imageUrl}
      onImageRemove={() => setFormData(prev => ({ ...prev, imageUrl: null }))}
      maxSizeMB={5}
      showPreview={true}
    />
  );
}
```

## Migration from Base64

To migrate existing base64 images to CDN:

```bash
npm run migrate:images

# Or with specific provider
npm run migrate:images -- --provider=cloudinary
```

Migration script:
1. Reads all products with base64 imageUrl
2. Uploads each image to CDN
3. Updates product with new CDN URL
4. Removes base64 from database

## Troubleshooting

### Images not uploading
- Check STORAGE_PROVIDER is set correctly
- Verify provider credentials
- Check file size doesn't exceed limit
- Check MIME type is allowed

### Cloudinary issues
- Verify cloud name, API key, API secret
- Check Cloudinary account has available credits
- Verify folder permissions in Cloudinary dashboard

### AWS S3 issues
- Check bucket exists and is in specified region
- Verify IAM user has S3 permissions
- Check bucket policy allows public read
- Verify access key and secret are correct

### Performance issues
- Use CDN endpoints provided by provider
- Enable image optimization in provider settings
- Consider using thumbnails for product lists
- Add caching headers to responses

## Next Steps

1. Choose your preferred storage provider
2. Set up credentials in .env
3. Restart your API server
4. Test image upload via API documentation
5. Update product creation forms to use ImageUpload component
6. Run image migration if needed
