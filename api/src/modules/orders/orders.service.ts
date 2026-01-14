import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Document, DocumentItem } from './entities/document.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { CustomersService } from '../customers/customers.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentItem)
    private readonly documentItemRepository: Repository<DocumentItem>,
    private readonly customersService: CustomersService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async createOrder(createOrderDto: CreateOrderDto): Promise<any> {
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const year = now.getFullYear();

      // Generate document number
      const documentNumber = await this.getNextDocumentNumber(year, manager);

      // Get customer ID
      let customerId = createOrderDto.customerId;
      if (!customerId && createOrderDto.customerPhone) {
        const customer = await this.customersService.findByPhone(
          createOrderDto.customerPhone,
        );
        customerId = customer?.id;
      }

      // Get default values from config
      const adminId = createOrderDto.adminId || null;
      const cashRegisterId =
        createOrderDto.cashRegisterId ||
        this.configService.get<number>('defaults.cashRegisterId');
      const warehouseId =
        createOrderDto.warehouseId ||
        this.configService.get<number>('defaults.warehouseId');
      const documentTypeId =
        createOrderDto.documentTypeId ||
        this.configService.get<number>('defaults.documentTypeId');

      // Calculate total
      const total = createOrderDto.items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const discount = item.discount || 0;
        const discountAmount =
          item.discountType === 1 ? (itemTotal * discount) / 100 : discount;
        return sum + (itemTotal - discountAmount);
      }, 0);

      // Create document
      const document = manager.create(Document, {
        number: documentNumber,
        adminId,
        customerId,
        cashRegisterId,
        orderNumber: documentNumber.split('-')[2],
        date: today,
        stockDate: today,
        total,
        isClockedOut: false,
        documentTypeId,
        warehouseId,
        note: createOrderDto.note,
        internalNote: createOrderDto.internalNote,
        discount: 0,
        discountType: 0,
        paidStatus: this.configService.get<number>('defaults.paidStatus'),
        discountApplyRule: 0,
        serviceType: 0,
      });

      const savedDocument = await manager.save(Document, document);

      // Create document items
      const items = createOrderDto.items.map((item) => {
        const itemTotal = item.price * item.quantity;
        const discount = item.discount || 0;
        const discountType = item.discountType || 0;
        const discountAmount =
          discountType === 1 ? (itemTotal * discount) / 100 : discount;
        const totalAfterDiscount = itemTotal - discountAmount;

        return manager.create(DocumentItem, {
          documentId: savedDocument.id,
          productId: item.productId,
          quantity: item.quantity,
          expectedQuantity: item.quantity,
          price: item.price,
          priceBeforeTax: item.price,
          discount,
          discountType,
          priceAfterDiscount:
            item.price -
            (discountType === 1 ? (item.price * discount) / 100 : discount),
          total: totalAfterDiscount,
          priceBeforeTaxAfterDiscount:
            item.price -
            (discountType === 1 ? (item.price * discount) / 100 : discount),
          totalAfterDocumentDiscount: totalAfterDiscount,
          productCost: 0,
          discountApplyRule: 0,
        });
      });

      const savedItems = await manager.save(DocumentItem, items);

      return {
        Document: savedDocument,
        Items: savedItems,
      };
    });
  }

  async getAllOrders(limit = 100): Promise<Document[]> {
    return this.documentRepository.find({
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer'],
    });
  }

  async getOrderById(id: number): Promise<any> {
    const document = await this.documentRepository.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });

    if (!document) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return {
      Document: document,
      Items: document.items,
    };
  }

  async getOrderByNumber(orderNumber: string): Promise<any> {
    const document = await this.documentRepository.findOne({
      where: { number: orderNumber },
      relations: ['customer', 'items'],
    });

    if (!document) {
      return null;
    }

    return {
      Document: document,
      Items: document.items,
    };
  }

  async getCustomerOrders(customerId: number, limit = 50): Promise<Document[]> {
    return this.documentRepository.find({
      where: { customerId },
      take: limit,
      order: { dateCreated: 'DESC' },
      relations: ['customer'],
    });
  }

  private async getNextDocumentNumber(
    year: number,
    manager: any,
  ): Promise<string> {
    const prefix = year.toString().slice(-2);
    const pattern = `${prefix}-%`;

    const result = await manager
      .createQueryBuilder(Document, 'document')
      .where('document.number LIKE :pattern', { pattern })
      .orderBy('document.number', 'DESC')
      .limit(1)
      .getOne();

    if (!result) {
      return `${prefix}-200-000001`;
    }

    const parts = result.number.split('-');
    const sequence = parseInt(parts[2]) + 1;

    return `${prefix}-200-${sequence.toString().padStart(6, '0')}`;
  }
}
