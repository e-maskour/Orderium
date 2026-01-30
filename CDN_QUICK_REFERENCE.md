# Quick Reference: Image CDN Implementation

## 🚀 Quick Start (5 minutes)

### 1. Set Environment Variable
```bash
# .env file
STORAGE_PROVIDER=LOCAL
# or CLOUDINARY, AWS_S3
```

### 2. Restart API
```bash
npm run start:dev
```

### 3. Test Upload
```bash
curl -X POST -F "image=@test.jpg" \
  http://localhost:3000/api/images/upload
```

## 📡 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/products/:id/image` | POST | Upload product image |
| `/products/:id/image` | DELETE | Delete product image |
| `/products/:id/image/optimize` | GET | Get optimized image URL |
| `/images/upload` | POST | Generic upload |
| `/images/delete` | DELETE | Generic delete |
| `/images/optimize` | GET | Optimize URL |
| `/images/thumbnail` | GET | Get thumbnail |
| `/images/provider` | GET | Check provider status |

## 💾 Configuration

### Local Development
```bash
STORAGE_PROVIDER=LOCAL
LOCAL_UPLOAD_DIR=./uploads/images
LOCAL_BASE_URL=http://localhost:3000/uploads/images
```

### Cloudinary (Free)
```bash
STORAGE_PROVIDER=CLOUDINARY
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### AWS S3
```bash
STORAGE_PROVIDER=AWS_S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=key
AWS_SECRET_ACCESS_KEY=secret
AWS_S3_BUCKET=bucket-name
```

## 🎯 File Locations

```
api/src/modules/images/
├── controllers/images.controller.ts
├── services/image.service.ts
├── providers/
│   ├── cloudinary.provider.ts
│   ├── s3.provider.ts
│   └── local.provider.ts
├── dto/
│   ├── image.dto.ts
│   └── product-image.dto.ts
├── interfaces/image-storage.interface.ts
└── images.module.ts

backoffice/src/components/
└── ImageUpload.tsx

api/src/database/migrations/
└── 1769523000000-AddImagePublicIdToProducts.ts
```

## 🔧 Usage in Components

### React (Backoffice)
```tsx
import { ImageUpload } from '@/components/ImageUpload';

<ImageUpload
  productId={productId}
  onImageUpload={(url, publicId) => {
    setFormData(prev => ({
      ...prev,
      imageUrl: url,
      imagePublicId: publicId
    }));
  }}
  currentImage={product?.imageUrl}
  maxSizeMB={5}
/>
```

## 🔌 Using ImageService in NestJS

```typescript
import { ImageService } from '@/modules/images/services/image.service';

@Controller('my-feature')
export class MyController {
  constructor(private imageService: ImageService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const result = await this.imageService.uploadImage(file, 'my-folder');
    return {
      url: result.url,
      publicId: result.publicId
    };
  }

  @Get('thumb')
  getThumbnail(@Query('url') url: string) {
    return this.imageService.getThumbnailUrl(url, 300);
  }
}
```

## 📦 Response Examples

### Upload Success
```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "products/12345",
    "size": 125000,
    "format": "jpg",
    "width": 1920,
    "height": 1080
  }
}
```

### Error
```json
{
  "statusCode": 400,
  "message": "File size exceeds maximum allowed size of 5MB",
  "error": "Bad Request"
}
```

## 🧪 Testing

### Upload
```bash
curl -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "image=@image.jpg" \
  http://localhost:3000/api/products/1/image
```

### Delete
```bash
curl -X DELETE \
  http://localhost:3000/api/products/1/image?publicId=products/12345
```

### Optimize
```bash
curl "http://localhost:3000/api/images/optimize?url=https://...&width=300&height=300"
```

### Check Provider
```bash
curl http://localhost:3000/api/images/provider
```

## 📋 Troubleshooting

| Issue | Solution |
|-------|----------|
| Upload fails | Check file size, type, and MIME type |
| No Cloudinary access | Check credentials in .env |
| S3 upload fails | Check bucket policy and IAM permissions |
| Image not found | Check URL and public ID |
| Slow performance | Enable CDN caching, check network |

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `CDN_IMPLEMENTATION_GUIDE.md` | Strategy & architecture |
| `IMAGE_STORAGE_SETUP_GUIDE.md` | Provider setup |
| `IMAGE_MIGRATION_GUIDE.md` | Migration from base64 |
| `CDN_IMPLEMENTATION_COMPLETE.md` | Full summary |

## ⚡ Performance Tips

1. Use thumbnails for product lists
```typescript
const thumbnailUrl = imageService.getThumbnailUrl(imageUrl, 300);
```

2. Enable aggressive caching
```typescript
// Response headers
res.set('Cache-Control', 'public, max-age=31536000');
```

3. Use lazy loading
```jsx
<img src={url} loading="lazy" />
```

4. Serve responsive images
```jsx
<picture>
  <source srcSet={getOptimized(url, 800)} media="(min-width: 800px)" />
  <img src={getOptimized(url, 400)} alt="product" />
</picture>
```

## 🔐 Security Checklist

- [ ] Validate file types (images only)
- [ ] Check file size limits
- [ ] Verify product ownership
- [ ] Use HTTPS for CDN URLs
- [ ] Enable CORS if needed
- [ ] Rate limit uploads
- [ ] Scan for malware (optional)

## 🚀 Deployment Checklist

- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Database migration run
- [ ] API tested
- [ ] Frontend component added
- [ ] Forms updated
- [ ] Images tested end-to-end
- [ ] Performance verified
- [ ] Error handling tested

## 💡 Common Patterns

### Upload and save URL
```typescript
const result = await imageService.uploadImage(file);
product.imageUrl = result.url;
product.imagePublicId = result.publicId;
await productRepository.save(product);
```

### Get thumbnail URL
```typescript
const thumb = imageService.getThumbnailUrl(product.imageUrl, 300);
```

### Delete image
```typescript
await imageService.deleteImage(product.imagePublicId);
product.imageUrl = null;
await productRepository.save(product);
```

### Transform URL
```typescript
const optimized = imageService.transformUrl(url, {
  width: 800,
  height: 600,
  quality: 80,
  format: 'auto'
});
```

## 📞 Support Resources

- **Cloudinary Help**: https://support.cloudinary.com
- **AWS Support**: https://aws.amazon.com/support
- **NestJS Docs**: https://docs.nestjs.com
- **React Docs**: https://react.dev

---

**Last Updated**: January 2026  
**Status**: Production Ready ✅
