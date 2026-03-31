import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import * as XLSX from 'xlsx';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Category } from '../categories/entities/category.entity';
import { UnitOfMeasure } from '../inventory/entities/unit-of-measure.entity';
import { Warehouse } from '../inventory/entities/warehouse.entity';
import { ImportResultDto } from './dto/import-result.dto';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  private get productRepository(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private get categoryRepository(): Repository<Category> {
    return this.tenantConnService.getRepository(Category);
  }

  private get unitOfMeasureRepository(): Repository<UnitOfMeasure> {
    return this.tenantConnService.getRepository(UnitOfMeasure);
  }

  private get warehouseRepository(): Repository<Warehouse> {
    return this.tenantConnService.getRepository(Warehouse);
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const { categoryIds, ...productData } = createProductDto;

    // Default saleUnitId and purchaseUnitId to the 'UNIT' unit of measure
    if (!productData.saleUnitId || !productData.purchaseUnitId) {
      const unitUom = await this.unitOfMeasureRepository.findOne({
        where: { code: 'UNIT' },
      });
      if (unitUom) {
        if (!productData.saleUnitId) productData.saleUnitId = unitUom.id;
        if (!productData.purchaseUnitId) productData.purchaseUnitId = unitUom.id;
      }
    }

    const product = this.productRepository.create(productData);

    if (categoryIds && categoryIds.length > 0) {
      product.categories = await this.categoryRepository.find({
        where: { id: In(categoryIds) },
      });
    }

    const saved = await this.productRepository.save(product);
    return saved;
  }

  async findAll(
    page = 1,
    perPage = 50,
    search?: string,
    code?: string,
    stockFilter?: 'negative' | 'zero' | 'positive',
    categoryIds?: number[],
    isService?: boolean,
  ): Promise<{ products: Product[]; count: number; totalCount: number }> {
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.saleUnitOfMeasure', 'saleUnitOfMeasure')
      .leftJoinAndSelect(
        'product.purchaseUnitOfMeasure',
        'purchaseUnitOfMeasure',
      )
      .where('product.isEnabled = :isEnabled', { isEnabled: true });

    // Search by name, code, or category name (OR across all three)
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.code ILIKE :search OR categories.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by code (exact-filter from the advanced filter panel)
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

    // Get total count before pagination
    const totalCount = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * perPage;
    queryBuilder.orderBy('product.name', 'ASC').skip(skip).take(perPage);

    const products = await queryBuilder.getMany();
    const count = products.length;

    return { products, count, totalCount };
  }

  private async invalidateProductCache(id?: number) {
    if (id) await this.cacheManager.del(`product:${id}`);
  }

  async findOne(id: number): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'saleUnitOfMeasure', 'purchaseUnitOfMeasure'],
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, product, 300_000);
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
    await this.invalidateProductCache(id);

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
    } catch {
      // Order items table might not exist, ignore this check
    }

    product.isEnabled = false;
    await this.productRepository.save(product);
    await this.invalidateProductCache(id);
  }

  async hardDelete(id: number): Promise<void> {
    await this.findOne(id);

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
    } catch {
      // Order items table might not exist, ignore this check
    }

    const result = await this.productRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.invalidateProductCache(id);
  }

  /**
   * Export products to XLSX format
   */
  async exportToXlsx(): Promise<Buffer> {
    const products = await this.productRepository.find({
      where: { isEnabled: true },
      relations: [
        'categories',
        'saleUnitOfMeasure',
        'purchaseUnitOfMeasure',
        'warehouse',
      ],
      order: { name: 'ASC' },
    });

    // Prepare data for export
    const exportData = products.map((product) => ({
      Code: product.code || '',
      Nom: product.name,
      Description: product.description || '',
      'Prix de vente': Number(product.price),
      "Prix d'achat": Number(product.cost),
      'Prix minimum': Number(product.minPrice),
      Stock: product.stock || 0,
      'Taxe vente (%)': Number(product.saleTax),
      'Taxe achat (%)': Number(product.purchaseTax),
      'Est service': product.isService ? 'Oui' : 'Non',
      'Prix modifiable': product.isPriceChangeAllowed ? 'Oui' : 'Non',
      'Unité vente': product.saleUnitOfMeasure?.name || '',
      'Unité achat': product.purchaseUnitOfMeasure?.name || '',
      Entrepôt: product.warehouse?.name || '',
      Catégories: product.categories?.map((c) => c.name).join(', ') || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths
    const colWidths = [
      { wch: 15 }, // Code
      { wch: 30 }, // Nom
      { wch: 40 }, // Description
      { wch: 15 }, // Prix de vente
      { wch: 15 }, // Prix d'achat
      { wch: 15 }, // Prix minimum
      { wch: 10 }, // Stock
      { wch: 15 }, // Taxe vente
      { wch: 15 }, // Taxe achat
      { wch: 12 }, // Est service
      { wch: 15 }, // Prix modifiable
      { wch: 15 }, // Unité vente
      { wch: 15 }, // Unité achat
      { wch: 20 }, // Entrepôt
      { wch: 30 }, // Catégories
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Produits');

    // Generate buffer
    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  /**
   * Import products from XLSX file
   */
  async importFromXlsx(file: Express.Multer.File): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result: ImportResultDto = {
      success: true,
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Read the file
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new BadRequestException('The file is empty');
      }

      // Get all units and warehouses for mapping
      const units = await this.unitOfMeasureRepository.find();
      const warehouses = await this.warehouseRepository.find();
      const categories = await this.categoryRepository.find();

      // Process each row
      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        const rowNumber = i + 2; // Excel rows start at 1, plus header row

        try {
          // Validate required fields
          if (!row['Nom']) {
            result.errors.push({
              row: rowNumber,
              error: 'Le nom du produit est requis',
              data: row,
            });
            result.failed++;
            continue;
          }

          // Find or create product by code
          let product: Product | null = null;
          if (row['Code']) {
            product = await this.productRepository.findOne({
              where: { code: row['Code'] },
              relations: ['categories'],
            });
          }

          const isUpdate = !!product;

          if (!product) {
            product = this.productRepository.create();
          }

          // Map fields
          product.name = row['Nom'];
          product.code = row['Code'] || null;
          product.description = row['Description'] || null;
          product.price = this.parseNumber(row['Prix de vente'], 0);
          product.cost = this.parseNumber(row["Prix d'achat"], 0);
          product.minPrice = this.parseNumber(row['Prix minimum'], 0);
          product.stock = this.parseNumber(row['Stock'], 0);
          product.saleTax = this.parseNumber(row['Taxe vente (%)'], 0);
          product.purchaseTax = this.parseNumber(row['Taxe achat (%)'], 0);
          product.isService = this.parseBoolean(row['Est service']);
          product.isPriceChangeAllowed = this.parseBoolean(
            row['Prix modifiable'],
            true,
          );

          // Map unit of measure
          if (row['Unité vente']) {
            const saleUnit = units.find(
              (u) => u.name.toLowerCase() === row['Unité vente'].toLowerCase(),
            );
            if (saleUnit) {
              product.saleUnitId = saleUnit.id;
            }
          }

          if (row['Unité achat']) {
            const purchaseUnit = units.find(
              (u) => u.name.toLowerCase() === row['Unité achat'].toLowerCase(),
            );
            if (purchaseUnit) {
              product.purchaseUnitId = purchaseUnit.id;
            }
          }

          // Map warehouse
          if (row['Entrepôt']) {
            const warehouse = warehouses.find(
              (w) => w.name.toLowerCase() === row['Entrepôt'].toLowerCase(),
            );
            if (warehouse) {
              product.warehouseId = warehouse.id;
            }
          }

          // Map categories
          if (row['Catégories']) {
            const categoryNames = row['Catégories']
              .split(',')
              .map((name: string) => name.trim())
              .filter((name: string) => name);

            const productCategories = categories.filter((c) =>
              categoryNames.some(
                (name: string) => c.name.toLowerCase() === name.toLowerCase(),
              ),
            );
            product.categories = productCategories;
          }

          // Save product
          await this.productRepository.save(product);

          if (isUpdate) {
            result.updated++;
          } else {
            result.imported++;
          }
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: error.message || 'Erreur inconnue',
            data: row,
          });
          result.failed++;
        }
      }

      result.success = result.failed === 0;
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la lecture du fichier: ${error.message}`,
      );
    }

    return result;
  }

  /**
   * Get XLSX template for import
   */
  getImportTemplate(): Buffer {
    const templateData = [
      {
        Code: 'PROD001',
        Nom: 'Exemple de produit',
        Description: 'Description du produit',
        'Prix de vente': 100,
        "Prix d'achat": 50,
        'Prix minimum': 80,
        Stock: 10,
        'Taxe vente (%)': 19,
        'Taxe achat (%)': 19,
        'Est service': 'Non',
        'Prix modifiable': 'Oui',
        'Unité vente': 'Unité',
        'Unité achat': 'Unité',
        Entrepôt: 'Principal',
        Catégories: 'Catégorie 1, Catégorie 2',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    const colWidths = [
      { wch: 15 },
      { wch: 30 },
      { wch: 40 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 30 },
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Produits');

    const buffer = XLSX.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    return buffer;
  }

  private parseNumber(value: any, defaultValue: number = 0): number {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  private parseBoolean(value: any, defaultValue: boolean = false): boolean {
    if (value === null || value === undefined || value === '') {
      return defaultValue;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    const str = String(value).toLowerCase().trim();
    return str === 'oui' || str === 'yes' || str === '1' || str === 'true';
  }
}
