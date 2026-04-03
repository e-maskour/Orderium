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
import {
  PRODUCT_XLSX_COL_WIDTHS,
  buildProductExportRow,
  mapImportRow,
} from './products.helpers';

@Injectable()
export class ProductsService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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

  private async invalidateProductCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`product:${id}`);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto): Promise<Product> {
    const { categoryIds, ...productData } = dto;

    if (!productData.saleUnitId || !productData.purchaseUnitId) {
      const unitUom = await this.unitOfMeasureRepository.findOne({
        where: { code: 'UNIT' },
      });
      if (unitUom) {
        if (!productData.saleUnitId) productData.saleUnitId = unitUom.id;
        if (!productData.purchaseUnitId)
          productData.purchaseUnitId = unitUom.id;
      }
    }

    const product = this.productRepository.create(productData);
    if (categoryIds?.length) {
      product.categories = await this.categoryRepository.find({
        where: { id: In(categoryIds) },
      });
    }

    return this.productRepository.save(product);
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
    const qb = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.categories', 'categories')
      .leftJoinAndSelect('product.saleUnitOfMeasure', 'saleUnitOfMeasure')
      .leftJoinAndSelect(
        'product.purchaseUnitOfMeasure',
        'purchaseUnitOfMeasure',
      )
      .where('product.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      qb.andWhere(
        '(product.name ILIKE :search OR product.code ILIKE :search OR categories.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (code) qb.andWhere('product.code ILIKE :code', { code: `%${code}%` });
    if (stockFilter === 'negative') qb.andWhere('product.stock < 0');
    else if (stockFilter === 'zero') qb.andWhere('product.stock = 0');
    else if (stockFilter === 'positive') qb.andWhere('product.stock > 0');
    if (categoryIds?.length)
      qb.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
    if (isService !== undefined)
      qb.andWhere('product.isService = :isService', { isService });

    qb.orderBy('product.name', 'ASC')
      .skip((page - 1) * perPage)
      .take(perPage);
    const [products, totalCount] = await qb.getManyAndCount();
    return { products, count: products.length, totalCount };
  }

  async findOne(id: number): Promise<Product> {
    const cacheKey = `product:${id}`;
    const cached = await this.cacheManager.get<Product>(cacheKey);
    if (cached) return cached;

    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['categories', 'saleUnitOfMeasure', 'purchaseUnitOfMeasure'],
    });
    if (!product)
      throw new NotFoundException(`Product with ID ${id} not found`);
    await this.cacheManager.set(cacheKey, product, 300_000);
    return product;
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const { categoryIds, ...productData } = dto;
    const product = await this.findOne(id);
    Object.assign(product, productData);

    if (categoryIds !== undefined) {
      product.categories = categoryIds.length
        ? await this.categoryRepository.find({ where: { id: In(categoryIds) } })
        : [];
    }

    await this.productRepository.save(product);
    await this.invalidateProductCache(id);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const product = await this.findOne(id);
    await this.checkProductInUse(id);
    product.isEnabled = false;
    await this.productRepository.save(product);
    await this.invalidateProductCache(id);
  }

  async hardDelete(id: number): Promise<void> {
    await this.findOne(id);
    await this.checkProductInUse(id);
    const result = await this.productRepository.delete(id);
    if (result.affected === 0)
      throw new NotFoundException(`Product with ID ${id} not found`);
    await this.invalidateProductCache(id);
  }

  private async checkProductInUse(id: number): Promise<void> {
    const invoiceCount = await this.productRepository.manager.query(
      `SELECT COUNT(*) as count FROM invoice_items WHERE "productId" = $1`,
      [id],
    );
    if (parseInt(invoiceCount[0]?.count || '0') > 0) {
      throw new ConflictException(
        'Cannot delete product that is used in invoices. Please remove from all invoices first.',
      );
    }

    try {
      const orderCount = await this.productRepository.manager.query(
        `SELECT COUNT(*) as count FROM order_items WHERE "productId" = $1`,
        [id],
      );
      if (parseInt(orderCount[0]?.count || '0') > 0) {
        throw new ConflictException(
          'Cannot delete product that is used in orders. Please remove from all orders first.',
        );
      }
    } catch (e) {
      if (!(e instanceof ConflictException)) {
        // order_items table might not exist — ignore
      } else {
        throw e;
      }
    }
  }

  // ─── XLSX Export ──────────────────────────────────────────────────────────

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

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(products.map(buildProductExportRow));
    ws['!cols'] = PRODUCT_XLSX_COL_WIDTHS;
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── XLSX Import ──────────────────────────────────────────────────────────

  async importFromXlsx(file: Express.Multer.File): Promise<ImportResultDto> {
    if (!file) throw new BadRequestException('No file provided');

    const result: ImportResultDto = {
      success: true,
      imported: 0,
      updated: 0,
      failed: 0,
      errors: [],
    };

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const data = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );

      if (data.length === 0) throw new BadRequestException('The file is empty');

      const [units, warehouses, categories] = await Promise.all([
        this.unitOfMeasureRepository.find(),
        this.warehouseRepository.find(),
        this.categoryRepository.find(),
      ]);

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNumber = i + 2;

        try {
          if (!row['Nom']) {
            result.errors.push({
              row: rowNumber,
              error: 'Le nom du produit est requis',
              data: row,
            });
            result.failed++;
            continue;
          }

          let product: Product | null = null;
          if (row['Code']) {
            product = await this.productRepository.findOne({
              where: { code: row['Code'] as string },
              relations: ['categories'],
            });
          }
          const isUpdate = !!product;
          if (!product) product = this.productRepository.create();

          mapImportRow(row, product, units, warehouses, categories);
          await this.productRepository.save(product);

          if (isUpdate) result.updated++;
          else result.imported++;
        } catch (error) {
          result.errors.push({
            row: rowNumber,
            error: (error as Error).message || 'Erreur inconnue',
            data: row,
          });
          result.failed++;
        }
      }

      result.success = result.failed === 0;
    } catch (error) {
      throw new BadRequestException(
        `Erreur lors de la lecture du fichier: ${(error as Error).message}`,
      );
    }

    return result;
  }

  // ─── Import template ──────────────────────────────────────────────────────

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
    ws['!cols'] = PRODUCT_XLSX_COL_WIDTHS;
    XLSX.utils.book_append_sheet(wb, ws, 'Produits');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
