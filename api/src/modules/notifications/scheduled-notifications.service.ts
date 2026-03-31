import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Repository, LessThan, In } from 'typeorm';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { OrderNotificationService } from './order-notification.service';
import { Product } from '../products/entities/product.entity';
import { Order } from '../orders/entities/order.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { Quote, QuoteStatus } from '../quotes/entities/quote.entity';

/**
 * Scheduled notification jobs.
 * Requires ScheduleModule.forRoot() to be imported in AppModule.
 */
@Injectable()
export class ScheduledNotificationsService {
  private readonly logger = new Logger(ScheduledNotificationsService.name);

  constructor(
    private readonly tenantConnService: TenantConnectionService,
    private readonly orderNotificationService: OrderNotificationService,
  ) {}

  private get productRepo(): Repository<Product> {
    return this.tenantConnService.getRepository(Product);
  }

  private get orderRepo(): Repository<Order> {
    return this.tenantConnService.getRepository(Order);
  }

  private get invoiceRepo(): Repository<Invoice> {
    return this.tenantConnService.getRepository(Invoice);
  }

  private get quoteRepo(): Repository<Quote> {
    return this.tenantConnService.getRepository(Quote);
  }

  // ─── Stock Alerts — daily at 08:00 ──────────────────────────────────────────

  @Cron('0 8 * * *', { name: 'stock-alerts' })
  async checkLowStockAlerts(): Promise<void> {
    this.logger.log('Running low-stock alert check...');
    try {
      const products = await this.productRepo
        .createQueryBuilder('product')
        .where('product.isEnabled = true')
        .andWhere('product.stockAlertThreshold IS NOT NULL')
        .andWhere('product.stock <= product.stockAlertThreshold')
        .getMany();

      let alertCount = 0;
      for (const product of products) {
        try {
          await this.orderNotificationService.notifyStockLow(product);
          alertCount++;
        } catch (err) {
          this.logger.error(
            `Stock alert failed for product ${product.id}`,
            (err as Error)?.stack,
          );
        }
      }

      if (alertCount > 0) {
        try {
          await this.orderNotificationService.notifyStockDailySummary(
            alertCount,
          );
        } catch (err) {
          this.logger.error(
            'Stock daily summary failed',
            (err as Error)?.stack,
          );
        }
      }

      this.logger.log(
        `Stock alert check done — ${alertCount} product(s) below threshold`,
      );
    } catch (err) {
      this.logger.error('checkLowStockAlerts failed', (err as Error)?.stack);
    }
  }

  // ─── Overdue Order Payments — daily at 09:00 ────────────────────────────────

  @Cron('0 9 * * *', { name: 'overdue-order-payments' })
  async checkOverdueOrderPayments(): Promise<void> {
    this.logger.log('Running overdue order payments check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueOrders = await this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.customer', 'customer')
        .where('order.amountDueDate IS NOT NULL')
        .andWhere('order.amountDueDate < :today', { today })
        .andWhere('order.remainingAmount > 0')
        .andWhere('order.fromClient = true')
        .getMany();

      for (const order of overdueOrders) {
        try {
          await this.orderNotificationService.notifyOrderPaymentOverdue(order);
        } catch (err) {
          this.logger.error(
            `Overdue order notif failed for order ${order.id}`,
            (err as Error)?.stack,
          );
        }
      }

      this.logger.log(
        `Overdue order check done — ${overdueOrders.length} order(s) overdue`,
      );
    } catch (err) {
      this.logger.error(
        'checkOverdueOrderPayments failed',
        (err as Error)?.stack,
      );
    }
  }

  // ─── Overdue Invoice Payments — daily at 09:05 ──────────────────────────────

  @Cron('5 9 * * *', { name: 'overdue-invoice-payments' })
  async checkOverdueInvoicePayments(): Promise<void> {
    this.logger.log('Running overdue invoice payments check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueInvoices = await this.invoiceRepo
        .createQueryBuilder('invoice')
        .leftJoinAndSelect('invoice.customer', 'customer')
        .where('invoice.amountDueDate IS NOT NULL')
        .andWhere('invoice.amountDueDate < :today', { today })
        .andWhere('invoice.remainingAmount > 0')
        .getMany();

      for (const invoice of overdueInvoices) {
        try {
          await this.orderNotificationService.notifyInvoicePaymentOverdue(
            invoice,
          );
        } catch (err) {
          this.logger.error(
            `Overdue invoice notif failed for invoice ${invoice.id}`,
            (err as Error)?.stack,
          );
        }
      }

      this.logger.log(
        `Overdue invoice check done — ${overdueInvoices.length} invoice(s) overdue`,
      );
    } catch (err) {
      this.logger.error(
        'checkOverdueInvoicePayments failed',
        (err as Error)?.stack,
      );
    }
  }

  // ─── Daily Sales Summary — daily at 20:00 ───────────────────────────────────

  @Cron('0 20 * * *', { name: 'daily-sales-summary' })
  async sendDailySalesSummary(): Promise<void> {
    this.logger.log('Running daily sales summary...');
    try {
      const today = new Date();
      const dateStr = today.toLocaleDateString('fr-MA');

      const startOfDay = new Date(today);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(order.id)', 'ordersCount')
        .addSelect('COALESCE(SUM(order.subtotal), 0)', 'amount')
        .where('order.dateCreated >= :start', { start: startOfDay })
        .andWhere('order.dateCreated <= :end', { end: endOfDay })
        .andWhere('order.isValidated = true')
        .getRawOne<{ ordersCount: string; amount: string }>();

      const ordersCount = Number(result?.ordersCount ?? 0);
      const amount = Number(result?.amount ?? 0);

      await this.orderNotificationService.notifyDailySalesSummary(
        dateStr,
        ordersCount,
        amount,
      );
      this.logger.log(
        `Daily sales summary sent — ${ordersCount} orders, ${amount} MAD`,
      );
    } catch (err) {
      this.logger.error('sendDailySalesSummary failed', (err as Error)?.stack);
    }
  }

  // ─── Weekly Revenue Report — every Monday at 08:00 ──────────────────────────

  @Cron('0 8 * * 1', { name: 'weekly-revenue-report' })
  async sendWeeklyRevenueReport(): Promise<void> {
    this.logger.log('Running weekly revenue report...');
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 7);
      weekStart.setHours(0, 0, 0, 0);

      const weekStartStr = weekStart.toLocaleDateString('fr-MA');

      const result = await this.orderRepo
        .createQueryBuilder('order')
        .select('COUNT(order.id)', 'ordersCount')
        .addSelect('COALESCE(SUM(order.subtotal), 0)', 'amount')
        .where('order.dateCreated >= :start', { start: weekStart })
        .andWhere('order.dateCreated <= :end', { end: today })
        .andWhere('order.isValidated = true')
        .getRawOne<{ ordersCount: string; amount: string }>();

      const ordersCount = Number(result?.ordersCount ?? 0);
      const amount = Number(result?.amount ?? 0);

      await this.orderNotificationService.notifyWeeklyRevenueReport(
        weekStartStr,
        ordersCount,
        amount,
      );
      this.logger.log(
        `Weekly revenue report sent — ${ordersCount} orders, ${amount} MAD`,
      );
    } catch (err) {
      this.logger.error(
        'sendWeeklyRevenueReport failed',
        (err as Error)?.stack,
      );
    }
  }

  // ─── Auto-close Expired Open Quotes — daily at 01:00 ────────────────────────

  @Cron('0 1 * * *', { name: 'auto-close-expired-quotes' })
  async autoCloseExpiredQuotes(): Promise<void> {
    this.logger.log('Running auto-close expired quotes...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expired = await this.quoteRepo.find({
        where: {
          status: In([QuoteStatus.DRAFT, QuoteStatus.OPEN]),
          expirationDate: LessThan(today),
        },
        select: ['id'],
      });

      if (expired.length === 0) {
        this.logger.log('Auto-close expired quotes done — no quotes to close');
        return;
      }

      const ids = expired.map((q) => q.id);
      await this.quoteRepo
        .createQueryBuilder()
        .update(Quote)
        .set({ status: QuoteStatus.CLOSED })
        .where('id IN (:...ids)', { ids })
        .execute();

      this.logger.log(
        `Auto-close expired quotes done — ${expired.length} quote(s) closed`,
      );
    } catch (err) {
      this.logger.error('autoCloseExpiredQuotes failed', (err as Error)?.stack);
    }
  }

  // ─── Quotes Expiring Soon — daily at 09:15 ──────────────────────────────────

  @Cron('15 9 * * *', { name: 'quotes-expiring-soon' })
  async notifyExpiringQuotes(): Promise<void> {
    this.logger.log('Running quotes-expiring-soon check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Quotes that expire within the next 3 days and are still actionable
      const in3Days = new Date(today);
      in3Days.setDate(today.getDate() + 3);

      const expiring = await this.quoteRepo
        .createQueryBuilder('quote')
        .leftJoinAndSelect('quote.customer', 'customer')
        .where('quote.status IN (:...statuses)', {
          statuses: [QuoteStatus.DRAFT, QuoteStatus.OPEN],
        })
        .andWhere('quote.expirationDate IS NOT NULL')
        .andWhere('quote.expirationDate >= :today', { today })
        .andWhere('quote.expirationDate <= :in3Days', { in3Days })
        .getMany();

      if (expiring.length > 0) {
        try {
          const quoteNumbers = expiring
            .map((q) => q.documentNumber)
            .filter(Boolean);
          await this.orderNotificationService.notifyQuotesExpiringSoon(
            expiring.length,
            quoteNumbers,
          );
        } catch (err) {
          this.logger.error(
            'notifyQuotesExpiringSoon batch failed',
            (err as Error)?.stack,
          );
        }
      }

      this.logger.log(
        `Quotes-expiring-soon check done — ${expiring.length} quote(s) expiring`,
      );
    } catch (err) {
      this.logger.error('notifyExpiringQuotes failed', (err as Error)?.stack);
    }
  }
}
