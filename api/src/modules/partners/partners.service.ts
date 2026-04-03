import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { Portal } from '../portal/entities/portal.entity';
import { Invoice, InvoiceStatus } from '../invoices/entities/invoice.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import {
  computeMonthlyData,
  aggregatePartnerInvoices,
} from './partners.helpers';

@Injectable()
export class PartnersService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  private get partnerRepository(): Repository<Partner> {
    return this.tenantConnService.getRepository(Partner);
  }

  private get portalRepository(): Repository<Portal> {
    return this.tenantConnService.getRepository(Portal);
  }

  private get invoiceRepository(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get orderRepository(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private async invalidatePartnerCache(id?: number): Promise<void> {
    if (id) await this.cacheManager.del(`partner:${id}`);
  }

  private async updatePortalPartner(
    phoneNumber: string,
    partnerId: number,
    partnerName: string,
  ): Promise<void> {
    const portal = await this.portalRepository.findOne({
      where: { phoneNumber },
    });
    if (portal) {
      portal.customerId = partnerId;
      portal.isCustomer = true;
      portal.name = partnerName;
      await this.portalRepository.save(portal);
    }
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async upsert(
    dto: CreatePartnerDto,
    portalPhoneNumber?: string,
  ): Promise<Partner> {
    if (dto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing) {
        Object.assign(existing, dto);
        const updated = await this.partnerRepository.save(existing);
        if (portalPhoneNumber) {
          await this.updatePortalPartner(
            portalPhoneNumber,
            updated.id,
            updated.name,
          );
        }
        return updated;
      }
    }

    const partner = this.partnerRepository.create({
      ...dto,
      isCustomer: dto.isCustomer !== undefined ? dto.isCustomer : true,
      isEnabled: true,
    });
    const saved = await this.partnerRepository.save(partner);
    if (portalPhoneNumber) {
      await this.updatePortalPartner(portalPhoneNumber, saved.id, saved.name);
    }
    return saved;
  }

  async create(dto: CreatePartnerDto): Promise<Partner> {
    if (dto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing) throw new ConflictException('Phone number already exists');
    }
    const partner = this.partnerRepository.create(dto);
    return this.partnerRepository.save(partner);
  }

  async findAll(
    limit = 100,
    offset = 0,
    search?: string,
  ): Promise<{ partners: Partner[]; total: number }> {
    const qb = this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      qb.andWhere(
        '(partner.name ILIKE :search OR partner.phoneNumber ILIKE :search OR partner.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }
    qb.orderBy('partner.name', 'ASC').skip(offset).take(limit);

    const [partners, total] = await qb.getManyAndCount();
    return { partners, total };
  }

  async findOne(id: number): Promise<Partner> {
    const cacheKey = `partner:${id}`;
    const cached = await this.cacheManager.get<Partner>(cacheKey);
    if (cached) return cached;

    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner)
      throw new NotFoundException(`Partner with ID ${id} not found`);
    await this.cacheManager.set(cacheKey, partner, 300_000);
    return partner;
  }

  async searchByPhone(phone: string): Promise<Partner[]> {
    return this.partnerRepository.find({ where: { phoneNumber: phone } });
  }

  async findByPhone(phoneNumber: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { phoneNumber },
    });
    if (!partner)
      throw new NotFoundException(
        `Partner with phone ${phoneNumber} not found`,
      );
    return partner;
  }

  async update(id: number, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);
    if (dto.phoneNumber && dto.phoneNumber !== partner.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: dto.phoneNumber },
      });
      if (existing) throw new ConflictException('Phone number already exists');
    }
    Object.assign(partner, dto);
    const saved = await this.partnerRepository.save(partner);
    await this.invalidatePartnerCache(id);
    return saved;
  }

  async remove(id: number): Promise<void> {
    const partner = await this.findOne(id);
    partner.isEnabled = false;
    await this.partnerRepository.save(partner);
    await this.invalidatePartnerCache(id);
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getCustomersDashboard() {
    const customers = await this.partnerRepository.find({
      where: { isCustomer: true, isEnabled: true },
    });

    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.customerId IS NOT NULL')
      .andWhere('invoice.isValidated = :isValidated', { isValidated: true })
      .getMany();

    const {
      topPartners: topCustomers,
      lastUpdatedPartners: lastUpdatedCustomers,
    } = aggregatePartnerInvoices(invoices, customers, 'customerId');

    return {
      kpis: {
        totalCustomers: customers.length,
        customersWithInvoices: new Set(invoices.map((inv) => inv.customerId))
          .size,
        totalRevenue: invoices.reduce((sum, inv) => sum + Number(inv.total), 0),
        totalInvoices: invoices.length,
      },
      topCustomers,
      lastUpdatedCustomers,
    };
  }

  async getSuppliersDashboard() {
    const suppliers = await this.partnerRepository.find({
      where: { isSupplier: true, isEnabled: true },
    });

    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.supplierId IS NOT NULL')
      .andWhere('invoice.isValidated = :isValidated', { isValidated: true })
      .getMany();

    const {
      topPartners: topSuppliers,
      lastUpdatedPartners: lastUpdatedSuppliers,
    } = aggregatePartnerInvoices(invoices, suppliers, 'supplierId');

    return {
      kpis: {
        totalSuppliers: suppliers.length,
        suppliersWithInvoices: new Set(invoices.map((inv) => inv.supplierId))
          .size,
        totalExpenses: invoices.reduce(
          (sum, inv) => sum + Number(inv.total),
          0,
        ),
        totalInvoices: invoices.length,
      },
      topSuppliers,
      lastUpdatedSuppliers,
    };
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  async getCustomerAnalytics(customerId: number, year: number) {
    const partner = await this.partnerRepository.findOne({
      where: { id: customerId, isCustomer: true, isEnabled: true },
    });
    if (!partner) throw new NotFoundException('Customer not found');

    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.customerId = :customerId', { customerId })
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year })
      .getMany();

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.customerId = :customerId', { customerId })
      .andWhere('EXTRACT(YEAR FROM order.date) = :year', { year })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .getMany();

    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );

    const paidAmount = invoices
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const unpaidAmount = invoices
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
      .reduce((sum, inv) => sum + Number(inv.remainingAmount || inv.total), 0);

    return {
      year,
      chartData: computeMonthlyData(invoices),
      kpis: {
        totalInvoices: invoices.length,
        totalRevenue,
        paidAmount,
        unpaidAmount,
        averagePerInvoice:
          invoices.length > 0 ? totalRevenue / invoices.length : 0,
        totalOrders: orders.length,
        totalOrderRevenue: orders.reduce(
          (sum, ord) => sum + Number(ord.total),
          0,
        ),
        unpaidOrderAmount: orders.reduce(
          (sum, ord) => sum + Number(ord.remainingAmount),
          0,
        ),
      },
    };
  }

  async getSupplierAnalytics(supplierId: number, year: number) {
    const partner = await this.partnerRepository.findOne({
      where: { id: supplierId, isSupplier: true, isEnabled: true },
    });
    if (!partner) throw new NotFoundException('Supplier not found');

    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.supplierId = :supplierId', { supplierId })
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year })
      .getMany();

    const orders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.supplierId = :supplierId', { supplierId })
      .andWhere('EXTRACT(YEAR FROM order.date) = :year', { year })
      .andWhere('order.status != :cancelled', {
        cancelled: OrderStatus.CANCELLED,
      })
      .getMany();

    const totalExpenses = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );

    const paidAmount = invoices
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + Number(inv.total), 0);
    const unpaidAmount = invoices
      // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'partial')
      .reduce((sum, inv) => sum + Number(inv.remainingAmount || inv.total), 0);

    return {
      year,
      chartData: computeMonthlyData(invoices),
      kpis: {
        totalInvoices: invoices.length,
        totalExpenses,
        paidAmount,
        unpaidAmount,
        averagePerInvoice:
          invoices.length > 0 ? totalExpenses / invoices.length : 0,
        totalOrders: orders.length,
        totalOrderExpenses: orders.reduce(
          (sum, ord) => sum + Number(ord.total),
          0,
        ),
        unpaidOrderAmount: orders.reduce(
          (sum, ord) => sum + Number(ord.remainingAmount),
          0,
        ),
      },
    };
  }
}
