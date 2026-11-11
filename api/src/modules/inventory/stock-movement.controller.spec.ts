import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockMovementController } from './stock-movement.controller';
import { StockService } from './stock.service';
import { MovementType, MovementStatus } from './entities/stock-movement.entity';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FilterStockMovementDto } from './dto/filter-stock-movement.dto';

// ─── Service Mock ─────────────────────────────────────────────────────────────

const mockStockService = {
  createMovement: jest.fn(),
  findAllMovements: jest.fn(),
  findMovement: jest.fn(),
  validateMovement: jest.fn(),
  internalTransfer: jest.fn(),
  updateMovement: jest.fn(),
  cancelMovement: jest.fn(),
};

// ─── Test Data ────────────────────────────────────────────────────────────────

const movementStub = {
  id: 1,
  reference: 'IN/2026/00001',
  movementType: MovementType.RECEIPT,
  productId: 1,
  sourceWarehouseId: null,
  destWarehouseId: 1,
  quantity: 50,
  status: MovementStatus.DRAFT,
  dateCreated: new Date().toISOString(),
  dateUpdated: new Date().toISOString(),
};

const doneMovementStub = {
  ...movementStub,
  status: MovementStatus.DONE,
  dateDone: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockMovementController', () => {
  let controller: StockMovementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockMovementController],
      providers: [{ provide: StockService, useValue: mockStockService }],
    }).compile();

    controller = module.get<StockMovementController>(StockMovementController);
    jest.clearAllMocks();
  });

  // ─── POST /inventory/movements ──────────────────────────────────────────────

  describe('create', () => {
    it('creates a movement and returns 201-equivalent response', async () => {
      mockStockService.createMovement.mockResolvedValue(movementStub);

      const result = await controller.create({
        movementType: MovementType.RECEIPT,
        productId: 1,
        destWarehouseId: 1,
        quantity: 50,
      });

      expect(mockStockService.createMovement).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(movementStub);
    });

    it('propagates NotFoundException when product does not exist', async () => {
      mockStockService.createMovement.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(
        controller.create({
          movementType: MovementType.RECEIPT,
          productId: 999,
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('propagates NotFoundException when warehouse does not exist', async () => {
      mockStockService.createMovement.mockRejectedValue(
        new NotFoundException('Destination warehouse with ID 999 not found'),
      );

      await expect(
        controller.create({
          movementType: MovementType.RECEIPT,
          productId: 1,
          destWarehouseId: 999,
          quantity: 10,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── GET /inventory/movements ───────────────────────────────────────────────

  describe('findAll', () => {
    const resolve = (movements: unknown[], total = movements.length) =>
      mockStockService.findAllMovements.mockResolvedValue({ movements, total });

    it('returns all movements without filters (no pagination)', async () => {
      resolve([movementStub]);

      const result = await controller.findAll();

      expect(mockStockService.findAllMovements).toHaveBeenCalledWith(
        expect.objectContaining({ page: undefined, limit: undefined }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.metadata).toEqual(
        expect.objectContaining({
          total: 1,
          limit: 1,
          offset: 0,
          hasNext: false,
        }),
      );
    });

    it('passes typed filters through', async () => {
      resolve([]);

      await controller.findAll({
        productId: 1,
        warehouseId: 2,
        status: MovementStatus.DONE,
        movementType: MovementType.DELIVERY,
        search: '  abc  ',
      });

      expect(mockStockService.findAllMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          warehouseId: 2,
          status: MovementStatus.DONE,
          movementType: MovementType.DELIVERY,
          search: 'abc',
        }),
      );
    });

    it('passes date range filters as Date objects, end date inclusive', async () => {
      resolve([]);

      await controller.findAll({
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

      const call = mockStockService.findAllMovements.mock.calls[0][0];
      expect(call.startDate).toBeInstanceOf(Date);
      expect(call.endDate).toBeInstanceOf(Date);
      expect(call.endDate.toISOString()).toBe('2026-03-31T23:59:59.999Z');
    });

    it('passes pagination + sort and returns page metadata', async () => {
      resolve([movementStub], 60);

      const result = await controller.findAll({
        page: 2,
        limit: 25,
        sortField: 'productName',
        sortOrder: 'ASC',
      });

      expect(mockStockService.findAllMovements).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 25,
          sortField: 'productName',
          sortOrder: 'ASC',
        }),
      );
      expect(result.metadata).toEqual(
        expect.objectContaining({
          total: 60,
          limit: 25,
          offset: 25,
          page: 2,
          hasNext: true,
          hasPrev: true,
        }),
      );
    });
  });

  describe('FilterStockMovementDto validation', () => {
    const errorsFor = async (raw: Record<string, unknown>) =>
      validate(plainToInstance(FilterStockMovementDto, raw));

    it('accepts valid values and drops the "all" sentinel', async () => {
      const dto = plainToInstance(FilterStockMovementDto, {
        status: 'all',
        movementType: 'receipt',
        page: '2',
        limit: '50',
        sortOrder: 'desc',
      });
      expect(await validate(dto)).toHaveLength(0);
      expect(dto.status).toBeUndefined();
      expect(dto.page).toBe(2);
      expect(dto.sortOrder).toBe('DESC');
    });

    it.each([
      [{ status: 'bogus' }],
      [{ movementType: 'teleport' }],
      [{ startDate: 'not-a-date' }],
      [{ page: '0' }],
      [{ limit: '1000' }],
      [{ productId: 'abc' }],
      [{ sortField: 'product.name; DROP TABLE x' }],
    ])('rejects %o', async (raw) => {
      expect((await errorsFor(raw)).length).toBeGreaterThan(0);
    });
  });

  // ─── GET /inventory/movements/:id ───────────────────────────────────────────

  describe('findOne', () => {
    it('returns movement details', async () => {
      mockStockService.findMovement.mockResolvedValue(movementStub);

      const result = await controller.findOne('1');

      expect(mockStockService.findMovement).toHaveBeenCalledWith(1);
      expect(result.data).toEqual(movementStub);
    });

    it('propagates NotFoundException', async () => {
      mockStockService.findMovement.mockRejectedValue(
        new NotFoundException('Movement not found'),
      );

      await expect(controller.findOne('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── POST /inventory/movements/validate ─────────────────────────────────────

  describe('validate', () => {
    it('validates movement and returns done status', async () => {
      mockStockService.validateMovement.mockResolvedValue(doneMovementStub);

      const result = await controller.validate({ movementId: 1 });

      expect(mockStockService.validateMovement).toHaveBeenCalledWith({
        movementId: 1,
      });
      expect(result.data.status).toBe(MovementStatus.DONE);
    });

    it('propagates BadRequestException for already validated movement', async () => {
      mockStockService.validateMovement.mockRejectedValue(
        new BadRequestException('Movement already validated'),
      );

      await expect(controller.validate({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propagates BadRequestException for insufficient stock', async () => {
      mockStockService.validateMovement.mockRejectedValue(
        new BadRequestException('Insufficient stock at Main Warehouse'),
      );

      await expect(controller.validate({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('propagates BadRequestException for cancelled movement', async () => {
      mockStockService.validateMovement.mockRejectedValue(
        new BadRequestException('Cannot validate cancelled movement'),
      );

      await expect(controller.validate({ movementId: 1 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── POST /inventory/movements/transfer ─────────────────────────────────────

  describe('internalTransfer', () => {
    it('creates and validates an internal transfer', async () => {
      const transferResult = {
        ...movementStub,
        movementType: MovementType.INTERNAL,
        status: MovementStatus.DONE,
        sourceWarehouseId: 1,
        destWarehouseId: 2,
      };
      mockStockService.internalTransfer.mockResolvedValue(transferResult);

      const result = await controller.internalTransfer({
        productId: 1,
        sourceWarehouseId: 1,
        destWarehouseId: 2,
        quantity: 30,
      });

      expect(result.data.movementType).toBe(MovementType.INTERNAL);
      expect(result.data.status).toBe(MovementStatus.DONE);
    });

    it('propagates BadRequestException for same-warehouse transfer', async () => {
      mockStockService.internalTransfer.mockRejectedValue(
        new BadRequestException(
          'Source and destination warehouses cannot be the same',
        ),
      );

      await expect(
        controller.internalTransfer({
          productId: 1,
          sourceWarehouseId: 1,
          destWarehouseId: 1,
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── PATCH /inventory/movements/:id ─────────────────────────────────────────

  describe('update', () => {
    it('updates a movement quantity', async () => {
      const updated = { ...movementStub, quantity: 75 };
      mockStockService.updateMovement.mockResolvedValue(updated);

      const result = await controller.update('1', { quantity: 75 });

      expect(mockStockService.updateMovement).toHaveBeenCalledWith(1, {
        quantity: 75,
      });
      expect(result.data.quantity).toBe(75);
    });

    it('propagates BadRequestException for DONE movements', async () => {
      mockStockService.updateMovement.mockRejectedValue(
        new BadRequestException('Cannot update validated movement'),
      );

      await expect(controller.update('1', { quantity: 50 })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── DELETE /inventory/movements/:id ────────────────────────────────────────

  describe('cancel', () => {
    it('cancels a DRAFT movement', async () => {
      const cancelled = { ...movementStub, status: MovementStatus.CANCELLED };
      mockStockService.cancelMovement.mockResolvedValue(cancelled);

      const result = await controller.cancel('1');

      expect(mockStockService.cancelMovement).toHaveBeenCalledWith(1);
      expect(result.data.status).toBe(MovementStatus.CANCELLED);
    });

    it('propagates BadRequestException for DONE movements', async () => {
      mockStockService.cancelMovement.mockRejectedValue(
        new BadRequestException('Cannot cancel validated movement'),
      );

      await expect(controller.cancel('1')).rejects.toThrow(BadRequestException);
    });
  });
});
