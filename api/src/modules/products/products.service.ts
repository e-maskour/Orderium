import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const product = this.productRepository.create(createProductDto);
    return this.productRepository.save(product);
  }

  async findAll(
    limit = 100,
    offset = 0,
    search?: string,
  ): Promise<{ products: Product[]; total: number }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .where('product.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      queryBuilder.andWhere('product.name ILIKE :search', {
        search: `%${search}%`,
      });
    }

    queryBuilder.orderBy('product.name', 'ASC').skip(offset).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return { products, total };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);
    Object.assign(product, updateProductDto);
    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    
    // Check if product is used in invoice items
    const invoiceItemCount = await this.productRepository.manager.query(
      `SELECT COUNT(*) as count FROM invoice_items WHERE "productId" = $1`,
      [id]
    );
    
    if (parseInt(invoiceItemCount[0]?.count || '0') > 0) {
      throw new ConflictException('Cannot delete product that is used in invoices. Please remove from all invoices first.');
    }
    
    // Check if product is used in orders (if order_items table exists)
    try {
      const orderItemCount = await this.productRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_items WHERE "productId" = $1`,
        [id]
      );
      
      if (parseInt(orderItemCount[0]?.count || '0') > 0) {
        throw new ConflictException('Cannot delete product that is used in orders. Please remove from all orders first.');
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
      [id]
    );
    
    if (parseInt(invoiceItemCount[0]?.count || '0') > 0) {
      throw new ConflictException('Cannot delete product that is used in invoices. Please remove from all invoices first.');
    }
    
    // Check if product is used in orders (if order_items table exists)
    try {
      const orderItemCount = await this.productRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_items WHERE "productId" = $1`,
        [id]
      );
      
      if (parseInt(orderItemCount[0]?.count || '0') > 0) {
        throw new ConflictException('Cannot delete product that is used in orders. Please remove from all orders first.');
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
