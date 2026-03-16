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
  Res,
  Header,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ProductsService } from './products.service';
import { ImageService } from '../images/services/image.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { FilterProductsDto } from './dto/filter-products.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { ProductImageResponseDto } from '../images/dto/product-image.dto';
import { ApiRes } from '../../common/api-response';
import { PRD } from '../../common/response-codes';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(
    private readonly productsService: ProductsService,
    private readonly imageService: ImageService,
  ) { }

  @Post('create')
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);
    return ApiRes(PRD.CREATED, product);
  }

  @Post('filter')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Filter products with POST body' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'perPage', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  async filterProducts(
    @Body() filterDto: FilterProductsDto,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1);
    const perPageNum = Math.min(
      100,
      Math.max(1, parseInt(perPage ?? '50', 10) || 50),
    );

    const { products, totalCount } = await this.productsService.findAll(
      pageNum,
      perPageNum,
      filterDto.search,
      filterDto.code,
      filterDto.stockFilter,
      filterDto.categoryIds,
      filterDto.isService,
    );

    const offset = (pageNum - 1) * perPageNum;
    return ApiRes(PRD.FILTERED, products, {
      limit: perPageNum,
      offset,
      total: totalCount,
      hasNext: offset + perPageNum < totalCount,
      hasPrev: offset > 0,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({
    name: 'stockFilter',
    required: false,
    enum: ['negative', 'zero', 'positive'],
  })
  @ApiQuery({ name: 'categoryIds', required: false, type: [Number] })
  @ApiQuery({ name: 'isService', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Products retrieved successfully',
    type: [ProductResponseDto],
  })
  async findAll(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('search') search?: string,
    @Query('code') code?: string,
    @Query('stockFilter') stockFilter?: 'negative' | 'zero' | 'positive',
    @Query('categoryIds') categoryIds?: string,
    @Query('isService') isService?: string,
  ) {
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit ?? '50', 10) || 50),
    );
    const offsetNum = Math.max(0, parseInt(offset ?? '0', 10) || 0);
    const categoryIdsArray = categoryIds
      ? categoryIds.split(',').map((id) => parseInt(id, 10))
      : undefined;
    const isServiceBool =
      isService === 'true' ? true : isService === 'false' ? false : undefined;

    const { products, totalCount } = await this.productsService.findAll(
      limitNum,
      offsetNum,
      search,
      code,
      stockFilter,
      categoryIdsArray,
      isServiceBool,
    );

    return ApiRes(PRD.LIST, products, {
      limit: limitNum,
      offset: offsetNum,
      total: totalCount,
      hasNext: offsetNum + limitNum < totalCount,
      hasPrev: offsetNum > 0,
    });
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
    return ApiRes(PRD.DETAIL, product);
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
    return ApiRes(PRD.UPDATED, product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a product (set isEnabled to false)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return ApiRes(PRD.DELETED, null);
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
    const existingProduct = await this.productsService.findOne(productId);

    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    // Delete old image from MinIO before uploading the new one.
    // Prefer the stored publicId; fall back to extracting the key from the URL
    // for legacy products where imagePublicId was never persisted.
    const oldPublicId =
      existingProduct.imagePublicId ??
      (() => {
        if (!existingProduct.imageUrl) return null;
        try {
          const parsed = new URL(existingProduct.imageUrl);
          return parsed.pathname.replace(/^\/[^/]+\//, '') || null;
        } catch {
          return null;
        }
      })();
    if (oldPublicId) {
      try {
        await this.imageService.deleteImage(oldPublicId);
      } catch (error) {
        this.logger.warn(
          'Failed to delete old image from MinIO',
          (error as Error)?.message,
        );
      }
    }

    // Upload new image
    const imageResult = await this.imageService.uploadImage(file, `products`);

    // Update product with new image URL and public ID
    const product = await this.productsService.update(productId, {
      imageUrl: imageResult.url,
      imagePublicId: imageResult.publicId,
    });

    return ApiRes(PRD.IMAGE_UPLOADED, {
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
    });
  }

  @Delete(':id/image')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product image' })
  @ApiResponse({
    status: 200,
    description: 'Product image deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 400, description: 'No image to delete' })
  async deleteProductImage(
    @Param('id', ParseIntPipe) productId: number,
    @Query('publicId') publicId?: string,
  ) {
    // Verify product exists
    const product = await this.productsService.findOne(productId);

    // Get the object key: prefer explicit query param, then DB-stored publicId
    let imagePublicId = publicId ?? product.imagePublicId ?? undefined;

    if (!imagePublicId && product.imageUrl) {
      // Last-resort fallback: extract object key from full MinIO URL
      // e.g. http://localhost:9000/orderium-media/products/uuid.webp → products/uuid.webp
      try {
        const parsed = new URL(product.imageUrl);
        imagePublicId = parsed.pathname.replace(/^\/[^/]+\//, '');
      } catch {
        imagePublicId = undefined;
      }
    }

    if (!imagePublicId) {
      throw new BadRequestException('No image found for this product');
    }

    // Delete image from CDN
    try {
      await this.imageService.deleteImage(imagePublicId);
    } catch (error) {
      // If deletion from CDN fails, we can still clear the product's imageUrl
      this.logger.error('Failed to delete from CDN', (error as Error)?.stack);
    }

    // Update product to remove image URL and public ID
    const updatedProduct = await this.productsService.update(productId, {
      imageUrl: null,
      imagePublicId: null,
    });

    return ApiRes(PRD.IMAGE_DELETED, updatedProduct);
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
      return ApiRes(PRD.IMAGE_OPTIMIZED, { url: null, originalUrl: null });
    }

    // Get optimized URL
    const optimizedUrl = this.imageService.transformUrl(product.imageUrl, {
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
    });

    return ApiRes(PRD.IMAGE_OPTIMIZED, {
      url: optimizedUrl,
      originalUrl: product.imageUrl,
    });
  }

  @Get('export/xlsx')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename=produits.xlsx')
  @ApiOperation({ summary: 'Export all products to XLSX file' })
  @ApiResponse({
    status: 200,
    description: 'Products exported successfully',
  })
  async exportToXlsx(@Res() res: Response) {
    const buffer = await this.productsService.exportToXlsx();
    res.send(buffer);
  }

  @Post('import/xlsx')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import products from XLSX file' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Products imported successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async importFromXlsx(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.productsService.importFromXlsx(file);
    return ApiRes(PRD.IMPORTED, result);
  }

  @Get('import/template')
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header('Content-Disposition', 'attachment; filename=template-produits.xlsx')
  @ApiOperation({ summary: 'Download XLSX import template for products' })
  @ApiResponse({
    status: 200,
    description: 'Template downloaded successfully',
  })
  async getImportTemplate(@Res() res: Response) {
    const buffer = await this.productsService.getImportTemplate();
    res.send(buffer);
  }
}
