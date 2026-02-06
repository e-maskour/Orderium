import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from '../categories/entities/category.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;
    const product = this.productRepository.create(productData);

    if (categoryIds && categoryIds.length > 0) {
      product.categories = await this.categoryRepository.find({
        where: { id: In(categoryIds) },
      });
    }

    return this.productRepository.save(product);
  }

  async findAll(
    limit = 50,
    offset = 0,
    search?: string,
    code?: string,
    stockFilter?: 'negative' | 'zero' | 'positive',
    categoryIds?: number[],
    isService?: boolean,
  ): Promise<{ products: Product[]; total: number }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.saleUnitOfMeasure', 'saleUnitOfMeasure')
      .leftJoinAndSelect(
        'product.purchaseUnitOfMeasure',
        'purchaseUnitOfMeasure',
      )
      .where('product.isEnabled = :isEnabled', { isEnabled: true });

    // Search by name
    if (search) {
      queryBuilder.andWhere('product.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    // Filter by code
    if (code) {
      queryBuilder.andWhere('product.code ILIKE :code', {
        code: `%${code}%`,
      });
    }

    // Filter by stock level
    if (stockFilter === 'negative') {
      queryBuilder.andWhere('product.stock < 0');
    } else if (stockFilter === 'zero') {
      queryBuilder.andWhere('product.stock = 0');
    } else if (stockFilter === 'positive') {
      queryBuilder.andWhere('product.stock > 0');
    }

    // Filter by categories
    if (categoryIds && categoryIds.length > 0) {
      queryBuilder.andWhere('categories.id IN (:...categoryIds)', {
        categoryIds,
      });
    }

    // Filter by isService
    if (isService !== undefined) {
      queryBuilder.andWhere('product.isService = :isService', { isService });
    }

    queryBuilder.orderBy('product.name', 'ASC').skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return { products, total };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'saleUnitOfMeasure', 'purchaseUnitOfMeasure'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const { categoryIds, ...productData } = updateProductDto;
    const product = await this.findOne(id);
    Object.assign(product, productData);

    if (categoryIds !== undefined) {
      if (categoryIds.length > 0) {
        product.categories = await this.categoryRepository.find({
          where: { id: In(categoryIds) },
        });
      } else {
        product.categories = [];
      }
    }

    await this.productRepository.save(product);

    // Reload product with categories to return fresh data
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);

    // Check if product is used in invoice items
    const invoiceItemCount = await this.productRepository.manager.query(
      `SELECT COUNT(*) as count FROM invoice_items WHERE "productId" = $1`,
      [id],
    );

    if (parseInt(invoiceItemCount[0]?.count || '0') > 0) {
      throw new ConflictException(
        'Cannot delete product that is used in invoices. Please remove from all invoices first.',
      );
    }

    // Check if product is used in orders (if order_items table exists)
    try {
      const orderItemCount = await this.productRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_items WHERE "productId" = $1`,
        [id],
      );

      if (parseInt(orderItemCount[0]?.count || '0') > 0) {
        throw new ConflictException(
          'Cannot delete product that is used in orders. Please remove from all orders first.',
        );
      }
    } catch (error) {
      // Order items table might not exist, ignore this check
    }

    product.isEnabled = false;
    await this.productRepository.save(product);
  }

  async hardDelete(id: number): Promise<void> {
    const product = await this.findOne(id);

    // Check if product is used in invoice items
    const invoiceItemCount = await this.productRepository.manager.query(
      `SELECT COUNT(*) as count FROM invoice_items WHERE "productId" = $1`,
      [id],
    );

    if (parseInt(invoiceItemCount[0]?.count || '0') > 0) {
      throw new ConflictException(
        'Cannot delete product that is used in invoices. Please remove from all invoices first.',
      );
    }

    // Check if product is used in orders (if order_items table exists)
    try {
      const orderItemCount = await this.productRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_items WHERE "productId" = $1`,
        [id],
      );

      if (parseInt(orderItemCount[0]?.count || '0') > 0) {
        throw new ConflictException(
          'Cannot delete product that is used in orders. Please remove from all orders first.',
        );
      }
    } catch (error) {
      // Order items table might not exist, ignore this check
    }

    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }
}
