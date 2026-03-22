/**
 * ORDERS MODULE — MULTI-TENANT MIGRATION EXAMPLE
 * ────────────────────────────────────────────────────────────────────────────
 *
 * This file illustrates the minimal changes needed to migrate an existing
 * NestJS service to be tenant-aware using TenantAwareService + AsyncLocalStorage.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEP 1 — Update orders.module.ts
 * ────────────────────────────────────────────────────────────────────────────
 *
 * BEFORE:
 *   import { TypeOrmModule } from '@nestjs/typeorm';
 *   @Module({
 *     imports: [
 *       TypeOrmModule.forFeature([Order, OrderItem]),  // ← static connection
 *       ...
 *     ],
 *     providers: [OrdersService],
 *   })
 *
 * AFTER:
 *   import { TenantModule } from '../tenant/tenant.module';
 *   @Module({
 *     imports: [
 *       // Remove TypeOrmModule.forFeature — repositories are resolved dynamically
 *       TenantModule,  // ← provides TenantConnectionService
 *       ...
 *     ],
 *     providers: [OrdersService],
 *   })
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEP 2 — Update orders.service.ts
 * ────────────────────────────────────────────────────────────────────────────
 *
 * Key changes:
 *   ✗ Remove: @InjectRepository(Order) private orderRepo: Repository<Order>
 *   ✗ Remove: private readonly dataSource: DataSource  (injected)
 *   ✓ Add:    extends TenantAwareService
 *   ✓ Replace: this.orderRepo         → this.repo(Order)
 *   ✓ Replace: this.dataSource        → this.ds()
 *   ✓ Replace: bare cache keys        → this.tenantCacheKey('orders:...')
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Order, OrderItem, OrderStatus } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { PartnersService } from '../partners/partners.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { OrderNotificationService } from '../notifications/order-notification.service';
import { PDFService } from '../pdf/pdf.service';
import { StockService } from '../inventory/stock.service';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { TenantAwareService } from '../../common/services/tenant-aware.service';

/**
 * Tenant-aware version of OrdersService.
 *
 * - Extends TenantAwareService → gets this.repo(), this.ds(), this.tenantCacheKey()
 * - Uses dynamic repositories → correct tenant DB on every call, zero extra overhead
 * - Cache keys are automatically namespaced to the tenant slug
 */
@Injectable()
export class OrdersServiceTenantAware extends TenantAwareService {
  private readonly logger = new Logger(OrdersServiceTenantAware.name);

  constructor(
    // ↓ Required by TenantAwareService
    tenantConnService: TenantConnectionService,

    // ↓ Regular service dependencies (unchanged)
    private readonly partnersService: PartnersService,
    private readonly configService: ConfigService,
    private readonly configurationsService: ConfigurationsService,
    @Inject(forwardRef(() => OrderNotificationService))
    private readonly orderNotificationService: OrderNotificationService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly pdfService: PDFService,
    private readonly stockService: StockService,
  ) {
    super(tenantConnService);
  }

  // ─── Example: findAll with tenant-isolated cache ───────────────────────

  async findAll(): Promise<Order[]> {
    const cacheKey = this.tenantCacheKey('orders:all');
    //                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^
    // Produces: "tenant:acme:orders:all"
    // Different tenants never read each other's cache entries.

    const cached = await this.cacheManager.get<Order[]>(cacheKey);
    if (cached) return cached;

    // this.repo(Order) resolves to the ORDER table in the CURRENT TENANT's DB
    const orders = await this.repo(Order).find({
      relations: ['customer', 'items'],
      order: { dateCreated: 'DESC' },
    });

    await this.cacheManager.set(cacheKey, orders, 60_000);
    return orders;
  }

  // ─── Example: create with transaction in tenant DB ────────────────────

  async createOrder(createOrderDto: CreateOrderDto): Promise<Order> {
    if (!createOrderDto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }

    // this.ds() → tenant's DataSource; this.ds().transaction() → tenant TX
    return this.ds().transaction(async (manager) => {
      const order = manager.create(Order, {
        documentNumber: `PROV${Date.now()}`,
        date: createOrderDto.date ?? new Date(),
        customerId: createOrderDto.customerId,
        total: createOrderDto.total ?? 0,
        discount: createOrderDto.discount ?? 0,
        discountType: createOrderDto.discountType ?? 0,
        status: OrderStatus.DRAFT,
      });

      const saved = await manager.save(order);

      const items = createOrderDto.items.map((item) => {
        const orderItem = manager.create(OrderItem, {
          ...item,
          unitPrice: item.unitPrice ?? undefined,
          total: item.total ?? undefined,
        });
        orderItem.order = saved;
        return orderItem;
      });
      await manager.save(items);

      // Invalidate the list cache for THIS tenant only
      await this.cacheManager.del(this.tenantCacheKey('orders:all'));

      return manager.findOneOrFail(Order, {
        where: { id: saved.id },
        relations: ['items'],
      });
    });
  }

  // ─── Example: findOne ────────────────────────────────────────────────

  async findOne(id: number): Promise<Order> {
    const cacheKey = this.tenantCacheKey(`orders:${id}`);
    const cached = await this.cacheManager.get<Order>(cacheKey);
    if (cached) return cached;

    const order = await this.repo(Order).findOne({
      where: { id },
      relations: ['customer', 'items', 'items.product'],
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);

    await this.cacheManager.set(cacheKey, order, 30_000);
    return order;
  }
}

/**
 * ────────────────────────────────────────────────────────────────────────────
 * STEP 3 — Update orders.module.ts (complete file)
 * ────────────────────────────────────────────────────────────────────────────
 *
 * import { Module, forwardRef } from '@nestjs/common';
 * import { OrdersServiceTenantAware as OrdersService } from './orders-tenant.service';
 * import { OrdersController } from './orders.controller';
 * import { PartnersModule } from '../partners/partners.module';
 * import { ConfigurationsModule } from '../configurations/configurations.module';
 * import { NotificationsModule } from '../notifications/notifications.module';
 * import { PDFModule } from '../pdf/pdf.module';
 * import { InventoryModule } from '../inventory/inventory.module';
 * import { TenantModule } from '../tenant/tenant.module';
 *
 * @Module({
 *   imports: [
 *     // ↓ No more TypeOrmModule.forFeature([Order, OrderItem])
 *     TenantModule,          // ← provides TenantConnectionService
 *     PartnersModule,
 *     ConfigurationsModule,
 *     forwardRef(() => NotificationsModule),
 *     PDFModule,
 *     InventoryModule,
 *   ],
 *   controllers: [OrdersController],
 *   providers: [OrdersService],
 *   exports: [OrdersService],
 * })
 * export class OrdersModule {}
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEP 4 — Environment variables to add
 * ────────────────────────────────────────────────────────────────────────────
 *
 * # Master database (stores the tenants registry)
 * MASTER_DB_NAME=orderium_master
 *
 * # Super-admin API key (protect POST /api/admin/tenants, etc.)
 * SUPER_ADMIN_API_KEY=<generate with: openssl rand -hex 32>
 *
 * ────────────────────────────────────────────────────────────────────────────
 * STEP 5 — Bootstrap sequence
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 1. Create the master database:
 *      CREATE DATABASE orderium_master;
 *
 * 2. Run the master migration (creates the tenants table):
 *      npm run migration:run:master
 *
 * 3. Create your first tenant via the API:
 *      curl -X POST http://localhost:3000/api/admin/tenants \
 *        -H 'X-Super-Admin-Key: <your-key>' \
 *        -H 'Content-Type: application/json' \
 *        -d '{"name": "ACME Corp", "slug": "acme"}'
 *
 *    This automatically:
 *      - Creates database `orderium_acme`
 *      - Runs all TypeORM migrations on it
 *      - Creates MinIO bucket `orderium-acme`
 *
 * 4. Call any business endpoint with the tenant header:
 *      curl http://localhost:3000/api/orders \
 *        -H 'X-Tenant-ID: acme' \
 *        -H 'Authorization: Bearer <jwt>'
 */
