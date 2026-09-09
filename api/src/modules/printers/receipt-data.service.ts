import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { ConfigurationsService } from '../configurations/configurations.service';
import { Order } from '../orders/entities/order.entity';
import type { ReceiptData } from './escpos/receipt.types';

interface CompanyConfig {
  companyName?: string;
  phone?: string;
}

/**
 * Builds the thermal-receipt view of a document.
 *
 * Deliberately separate from PDFService: that module renders A4 HTML
 * documents, this one produces the narrow, monospaced view a receipt printer
 * can express. Both read the same Order.
 */
@Injectable()
export class ReceiptDataService {
  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly configurationsService: ConfigurationsService,
  ) {}

  private get orders(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private async company(): Promise<CompanyConfig> {
    try {
      const config =
        await this.configurationsService.findByEntity('my_company');
      return (config?.values ?? {}) as CompanyConfig;
    } catch {
      return {};
    }
  }

  /**
   * documentRef 0 is the agreed test-page marker used by Settings → Printers.
   * There is no order 0, so it must never reach the orders table.
   */
  private async sampleReceipt(): Promise<ReceiptData> {
    const company = await this.company();
    return {
      storeName: company.companyName || 'Morocom',
      storePhone: company.phone,
      orderNumber: 'TEST-0001',
      date: new Date().toLocaleString('fr-FR'),
      clientName: 'Test',
      items: [{ name: 'Article de test', qty: 1, unitPrice: 1, total: 1 }],
      subtotal: 1,
      total: 1,
      footer: 'Impression de test',
    };
  }

  async build(orderId: number): Promise<ReceiptData> {
    if (orderId === 0) return this.sampleReceipt();

    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const company = await this.company();
    const date = order.date ?? order.dateCreated ?? new Date();

    return {
      storeName: company.companyName || 'Morocom',
      storePhone: company.phone,
      orderNumber:
        order.receiptNumber ??
        order.orderNumber ??
        order.documentNumber ??
        `#${order.id}`,
      date: new Date(date).toLocaleString('fr-FR'),
      clientName: order.customerName ?? 'Client',
      clientPhone: order.customerPhone ?? undefined,
      items: (order.items ?? []).map((item) => ({
        name: item.product?.name ?? item.description ?? 'Article',
        qty: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        total: Number(item.total ?? 0),
      })),
      subtotal: Number(order.subtotal ?? 0),
      discount: order.discount != null ? Number(order.discount) : undefined,
      total: Number(order.total ?? 0),
    };
  }
}
