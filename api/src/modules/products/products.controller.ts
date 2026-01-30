import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { ImageService } from '../images/services/image.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductImageResponseDto } from '../images/dto/product-image.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly imageService: ImageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return {
      success: true,
      product,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const { products, total } = await this.productsService.findAll(
      limitNum,
      offsetNum,
      search,
    );

    return {
      success: true,
      products,
      total,
      limit: limitNum,
      offset: offsetNum,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Product retrieved successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id);
    return {
      success: true,
      product,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({
    status: 200,
    description: 'Product updated successfully',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    const product = await this.productsService.update(id, updateProductDto);
    return {
      success: true,
      product,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a product (set isEnabled to false)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return {
      success: true,
      message: 'Product deleted successfully',
    };
  }

  @Post(':id/image')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload or update product image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Product image uploaded successfully',
    type: ProductImageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadProductImage(
    @Param('id', ParseIntPipe) productId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Verify product exists
    await this.productsService.findOne(productId);

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Upload image
    const imageResult = await this.imageService.uploadImage(
      file,
      `products`,
    );

    // Update product with new image URL
    const product = await this.productsService.update(productId, {
      imageUrl: imageResult.url,
    });

    return {
      success: true,
      product,
      image: {
        url: imageResult.url,
        publicId: imageResult.publicId,
        size: imageResult.size,
        format: imageResult.format,
        width: imageResult.width,
        height: imageResult.height,
        thumbnailUrl: this.imageService.getThumbnailUrl(imageResult.url, 300),
        uploadedAt: new Date(),
      },
    };
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product image' })
  @ApiResponse({ status: 200, description: 'Product image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'No image to delete' })
  async deleteProductImage(
    @Param('id', ParseIntPipe) productId: number,
    @Query('publicId') publicId?: string,
  ) {
    // Verify product exists
    const product = await this.productsService.findOne(productId);

    // Get the public ID from query or product's imageUrl
    let imagePublicId = publicId;

    if (!imagePublicId && product.imageUrl) {
      // Try to extract public ID from known CDN providers
      // For Cloudinary: extract from URL
      // For S3: might be stored separately
      // This is a fallback - ideally publicId should be stored in DB
      imagePublicId = product.imageUrl;
    }

    if (!imagePublicId) {
      throw new BadRequestException('No image found for this product');
    }

    // Delete image from CDN
    try {
      await this.imageService.deleteImage(imagePublicId);
    } catch (error) {
      // If deletion from CDN fails, we can still clear the product's imageUrl
      console.error('Failed to delete from CDN:', error);
    }

    // Update product to remove image URL and public ID
    const updatedProduct = await this.productsService.update(productId, {
      imageUrl: null,
      imagePublicId: null,
    });

    return {
      success: true,
      product: updatedProduct,
      message: 'Product image deleted successfully',
    };
  }

  @Get(':id/image/optimize')
  @ApiOperation({ summary: 'Get optimized image URL for product' })
  @ApiQuery({ name: 'width', description: 'Image width', required: false })
  @ApiQuery({ name: 'height', description: 'Image height', required: false })
  @ApiResponse({
    status: 200,
    description: 'Optimized image URL',
    schema: {
      properties: {
        success: { type: 'boolean' },
        url: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getOptimizedImageUrl(
    @Param('id', ParseIntPipe) productId: number,
    @Query('width') width?: string,
    @Query('height') height?: string,
  ) {
    // Verify product exists
    const product = await this.productsService.findOne(productId);

    if (!product.imageUrl) {
      return {
        success: false,
        message: 'Product has no image',
        url: null,
      };
    }

    // Get optimized URL
    const optimizedUrl = this.imageService.transformUrl(product.imageUrl, {
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
    });

    return {
      success: true,
      url: optimizedUrl,
      originalUrl: product.imageUrl,
    };
  }
}
