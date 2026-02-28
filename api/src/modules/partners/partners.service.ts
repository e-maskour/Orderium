import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { Portal } from '../portal/entities/portal.entity';
import { Invoice } from '../invoices/entities/invoice.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
    @InjectRepository(Portal)
    private readonly portalRepository: Repository<Portal>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async upsert(
    createPartnerDto: CreatePartnerDto,
    portalPhoneNumber?: string,
  ): Promise<Partner> {
    // Check if partner exists by phone number
    if (createPartnerDto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: createPartnerDto.phoneNumber },
      });

      if (existing) {
        // Update existing partner
        Object.assign(existing, createPartnerDto);
        const updated = await this.partnerRepository.save(existing);

        // Update portal if phoneNumber is provided
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

    // Create new partner with isCustomer: true by default
    const partner = this.partnerRepository.create({
      ...createPartnerDto,
      isCustomer:
        createPartnerDto.isCustomer !== undefined
          ? createPartnerDto.isCustomer
          : true,
      isEnabled: true,
    });
    const savedPartner = await this.partnerRepository.save(partner);

    // Update portal with the new partnerId and name
    if (portalPhoneNumber) {
      await this.updatePortalPartner(
        portalPhoneNumber,
        savedPartner.id,
        savedPartner.name,
      );
    }

    return savedPartner;
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

  async create(createPartnerDto: CreatePartnerDto): Promise<Partner> {
    // Check if phone number already exists
    if (createPartnerDto.phoneNumber) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: createPartnerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    const partner = this.partnerRepository.create(createPartnerDto);
    return this.partnerRepository.save(partner);
  }

  async findAll(
    limit = 100,
    offset = 0,
    search?: string,
  ): Promise<{ partners: Partner[]; total: number }> {
    const queryBuilder = this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.isEnabled = :isEnabled', { isEnabled: true });

    if (search) {
      queryBuilder.andWhere(
        '(partner.name ILIKE :search OR partner.phoneNumber ILIKE :search OR partner.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    queryBuilder.orderBy('partner.name', 'ASC').skip(offset).take(limit);

    const [partners, total] = await queryBuilder.getManyAndCount();

    return { partners, total };
  }

  private async invalidatePartnerCache(id?: number) {
    if (id) await this.cacheManager.del(`partner:${id}`);
  }

  async findOne(id: number): Promise<Partner> {
    const cacheKey = `partner:${id}`;
    const cached = await this.cacheManager.get<Partner>(cacheKey);
    if (cached) return cached;

    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${id} not found`);
    }
    await this.cacheManager.set(cacheKey, partner, 300_000);
    return partner;
  }

  async searchByPhone(phone: string): Promise<Partner[]> {
    return this.partnerRepository.find({
      where: { phoneNumber: phone },
    });
  }

  async findByPhone(phoneNumber: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { phoneNumber },
    });
    if (!partner) {
      throw new NotFoundException(
        `Partner with phone ${phoneNumber} not found`,
      );
    }
    return partner;
  }

  async update(
    id: number,
    updatePartnerDto: UpdatePartnerDto,
  ): Promise<Partner> {
    const partner = await this.findOne(id);

    // Check if phone number is being changed and already exists
    if (
      updatePartnerDto.phoneNumber &&
      updatePartnerDto.phoneNumber !== partner.phoneNumber
    ) {
      const existing = await this.partnerRepository.findOne({
        where: { phoneNumber: updatePartnerDto.phoneNumber },
      });
      if (existing) {
        throw new ConflictException('Phone number already exists');
      }
    }

    Object.assign(partner, updatePartnerDto);
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

  async getCustomersDashboard() {
    // Get all customers
    const customers = await this.partnerRepository.find({
      where: { isCustomer: true, isEnabled: true },
    });

    const totalCustomers = customers.length;

    // Get all customer invoices
    const customerInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.customerId IS NOT NULL')
      .andWhere('invoice.isValidated = :isValidated', { isValidated: true })
      .getMany();

    const totalRevenue = customerInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const customersWithInvoices = new Set(
      customerInvoices.map((inv) => inv.customerId),
    ).size;
    const totalInvoices = customerInvoices.length;

    // Calculate top 5 customers by revenue
    const customerRevenueMap = new Map<
      number,
      { id: number; name: string; total: number; invoicesCount: number }
    >();

    for (const invoice of customerInvoices) {
      if (!invoice.customerId) continue;

      const existing = customerRevenueMap.get(invoice.customerId);
      if (existing) {
        existing.total += Number(invoice.total);
        existing.invoicesCount += 1;
      } else {
        const customer = customers.find((c) => c.id === invoice.customerId);
        if (customer) {
          customerRevenueMap.set(invoice.customerId, {
            id: customer.id,
            name: customer.name,
            total: Number(invoice.total),
            invoicesCount: 1,
          });
        }
      }
    }

    const topCustomers = Array.from(customerRevenueMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Calculate last 5 updated customers
    const customerLastUpdateMap = new Map<
      number,
      {
        id: number;
        name: string;
        phoneNumber: string;
        lastUpdate: Date;
        invoicesCount: number;
      }
    >();

    for (const invoice of customerInvoices) {
      if (!invoice.customerId) continue;

      const existing = customerLastUpdateMap.get(invoice.customerId);
      const invoiceDate = new Date(invoice.date);

      if (existing) {
        if (invoiceDate > existing.lastUpdate) {
          existing.lastUpdate = invoiceDate;
        }
        existing.invoicesCount += 1;
      } else {
        const customer = customers.find((c) => c.id === invoice.customerId);
        if (customer) {
          customerLastUpdateMap.set(invoice.customerId, {
            id: customer.id,
            name: customer.name,
            phoneNumber: customer.phoneNumber || '',
            lastUpdate: invoiceDate,
            invoicesCount: 1,
          });
        }
      }
    }

    const lastUpdatedCustomers = Array.from(customerLastUpdateMap.values())
      .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
      .slice(0, 5);

    return {
      kpis: {
        totalCustomers,
        customersWithInvoices,
        totalRevenue,
        totalInvoices,
      },
      topCustomers,
      lastUpdatedCustomers,
    };
  }

  async getSuppliersDashboard() {
    // Get all suppliers
    const suppliers = await this.partnerRepository.find({
      where: { isSupplier: true, isEnabled: true },
    });

    const totalSuppliers = suppliers.length;

    // Get all supplier invoices
    const supplierInvoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.supplierId IS NOT NULL')
      .andWhere('invoice.isValidated = :isValidated', { isValidated: true })
      .getMany();

    const totalExpenses = supplierInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const suppliersWithInvoices = new Set(
      supplierInvoices.map((inv) => inv.supplierId),
    ).size;
    const totalInvoices = supplierInvoices.length;

    // Calculate top 5 suppliers by expenses
    const supplierExpensesMap = new Map<
      number,
      { id: number; name: string; total: number; invoicesCount: number }
    >();

    for (const invoice of supplierInvoices) {
      if (!invoice.supplierId) continue;

      const existing = supplierExpensesMap.get(invoice.supplierId);
      if (existing) {
        existing.total += Number(invoice.total);
        existing.invoicesCount += 1;
      } else {
        const supplier = suppliers.find((s) => s.id === invoice.supplierId);
        if (supplier) {
          supplierExpensesMap.set(invoice.supplierId, {
            id: supplier.id,
            name: supplier.name,
            total: Number(invoice.total),
            invoicesCount: 1,
          });
        }
      }
    }

    const topSuppliers = Array.from(supplierExpensesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Calculate last 5 updated suppliers
    const supplierLastUpdateMap = new Map<
      number,
      {
        id: number;
        name: string;
        phoneNumber: string;
        lastUpdate: Date;
        invoicesCount: number;
      }
    >();

    for (const invoice of supplierInvoices) {
      if (!invoice.supplierId) continue;

      const existing = supplierLastUpdateMap.get(invoice.supplierId);
      const invoiceDate = new Date(invoice.date);

      if (existing) {
        if (invoiceDate > existing.lastUpdate) {
          existing.lastUpdate = invoiceDate;
        }
        existing.invoicesCount += 1;
      } else {
        const supplier = suppliers.find((s) => s.id === invoice.supplierId);
        if (supplier) {
          supplierLastUpdateMap.set(invoice.supplierId, {
            id: supplier.id,
            name: supplier.name,
            phoneNumber: supplier.phoneNumber || '',
            lastUpdate: invoiceDate,
            invoicesCount: 1,
          });
        }
      }
    }

    const lastUpdatedSuppliers = Array.from(supplierLastUpdateMap.values())
      .sort((a, b) => b.lastUpdate.getTime() - a.lastUpdate.getTime())
      .slice(0, 5);

    return {
      kpis: {
        totalSuppliers,
        suppliersWithInvoices,
        totalExpenses,
        totalInvoices,
      },
      topSuppliers,
      lastUpdatedSuppliers,
    };
  }

  async getCustomerAnalytics(customerId: number, year: number) {
    // Verify partner exists and is a customer
    const partner = await this.partnerRepository.findOne({
      where: { id: customerId, isCustomer: true, isEnabled: true },
    });

    if (!partner) {
      throw new NotFoundException('Customer not found');
    }

    // Get all invoices for this customer in the specified year
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.customerId = :customerId', { customerId })
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year })
      .getMany();

    // Calculate monthly chart data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.date).getMonth() === monthIndex,
      );

      return {
        month: monthIndex + 1,
        count: monthInvoices.length,
        amount: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      };
    });

    // Calculate KPIs
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === 'unpaid' || inv.status === 'partial',
    );
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.remainingAmount || inv.total),
      0,
    );
    const averagePerInvoice =
      totalInvoices > 0 ? totalRevenue / totalInvoices : 0;

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalInvoices,
        totalRevenue,
        paidAmount,
        unpaidAmount,
        averagePerInvoice,
      },
    };
  }

  async getSupplierAnalytics(supplierId: number, year: number) {
    // Verify partner exists and is a supplier
    const partner = await this.partnerRepository.findOne({
      where: { id: supplierId, isSupplier: true, isEnabled: true },
    });

    if (!partner) {
      throw new NotFoundException('Supplier not found');
    }

    // Get all invoices for this supplier in the specified year
    const invoices = await this.invoiceRepository
      .createQueryBuilder('invoice')
      .where('invoice.supplierId = :supplierId', { supplierId })
      .andWhere('EXTRACT(YEAR FROM invoice.date) = :year', { year })
      .getMany();

    // Calculate monthly chart data
    const monthlyData = Array.from({ length: 12 }, (_, monthIndex) => {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.date).getMonth() === monthIndex,
      );

      return {
        month: monthIndex + 1,
        count: monthInvoices.length,
        amount: monthInvoices.reduce((sum, inv) => sum + Number(inv.total), 0),
      };
    });

    // Calculate KPIs
    const totalInvoices = invoices.length;
    const totalExpenses = invoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid');
    const paidAmount = paidInvoices.reduce(
      (sum, inv) => sum + Number(inv.total),
      0,
    );
    const unpaidInvoices = invoices.filter(
      (inv) => inv.status === 'unpaid' || inv.status === 'partial',
    );
    const unpaidAmount = unpaidInvoices.reduce(
      (sum, inv) => sum + Number(inv.remainingAmount || inv.total),
      0,
    );
    const averagePerInvoice =
      totalInvoices > 0 ? totalExpenses / totalInvoices : 0;

    return {
      year,
      chartData: monthlyData,
      kpis: {
        totalInvoices,
        totalExpenses,
        paidAmount,
        unpaidAmount,
        averagePerInvoice,
      },
    };
  }
}
