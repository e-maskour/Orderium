import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';

// ─── Service Mock ─────────────────────────────────────────────────────────────

const mockStockService = {
  getAllStock: jest.fn(),
  getProductStock: jest.fn(),
  getWarehouseStock: jest.fn(),
  getStockAtWarehouse: jest.fn(),
  getLowStockProducts: jest.fn(),
  getStockValue: jest.fn(),
  reserveStock: jest.fn(),
  unreserveStock: jest.fn(),
};

// ─── Test Data ────────────────────────────────────────────────────────────────

const stockQuantStub = {
  id: 1,
  productId: 1,
  warehouseId: 1,
  quantity: 100,
  reservedQuantity: 10,
  availableQuantity: 90,
  incomingQuantity: 0,
  outgoingQuantity: 0,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockController', () => {
  let controller: StockController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [{ provide: StockService, useValue: mockStockService }],
    }).compile();

    controller = module.get<StockController>(StockController);
    jest.clearAllMocks();
  });

  // ─── GET /inventory/stock ───────────────────────────────────────────────────

  describe('getAllStock', () => {
    it('returns aggregated stock and wraps in ApiRes', async () => {
      mockStockService.getAllStock.mockResolvedValue([stockQuantStub]);

      const result = await controller.getAllStock();

      expect(mockStockService.getAllStock).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual([stockQuantStub]);
      expect(result.status).toBe(200);
    });

    it('returns empty array when no stock exists', async () => {
      mockStockService.getAllStock.mockResolvedValue([]);

      const result = await controller.getAllStock();

      expect(result.data).toEqual([]);
    });
  });

  // ─── GET /inventory/stock/product/:productId ────────────────────────────────

  describe('getProductStock', () => {
    it('returns product stock for a valid productId', async () => {
      mockStockService.getProductStock.mockResolvedValue([stockQuantStub]);

      const result = await controller.getProductStock('1');

      expect(mockStockService.getProductStock).toHaveBeenCalledWith(1);
      expect(result.data).toEqual([stockQuantStub]);
    });

    it('propagates NotFoundException from service', async () => {
      mockStockService.getProductStock.mockRejectedValue(
        new NotFoundException('Product not found'),
      );

      await expect(controller.getProductStock('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── GET /inventory/stock/warehouse/:warehouseId ────────────────────────────

  describe('getWarehouseStock', () => {
    it('returns warehouse stock for a valid warehouseId', async () => {
      mockStockService.getWarehouseStock.mockResolvedValue([stockQuantStub]);

      const result = await controller.getWarehouseStock('1');

      expect(mockStockService.getWarehouseStock).toHaveBeenCalledWith(1);
      expect(result.data).toHaveLength(1);
    });

    it('propagates NotFoundException from service', async () => {
      mockStockService.getWarehouseStock.mockRejectedValue(
        new NotFoundException('Warehouse not found'),
      );

      await expect(controller.getWarehouseStock('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── GET /inventory/stock/product/:productId/warehouse/:warehouseId ─────────

  describe('getStockAtWarehouse', () => {
    it('returns stock quant for product-warehouse pair', async () => {
      mockStockService.getStockAtWarehouse.mockResolvedValue(stockQuantStub);

      const result = await controller.getStockAtWarehouse('1', '1');

      expect(mockStockService.getStockAtWarehouse).toHaveBeenCalledWith(1, 1);
      expect(result.data).toEqual(stockQuantStub);
    });
  });

  // ─── GET /inventory/stock/low ───────────────────────────────────────────────

  describe('getLowStockProducts', () => {
    it('uses default threshold of 10 when no query param provided', async () => {
      mockStockService.getLowStockProducts.mockResolvedValue([]);

      await controller.getLowStockProducts();

      expect(mockStockService.getLowStockProducts).toHaveBeenCalledWith(10);
    });

    it('uses custom threshold when provided', async () => {
      mockStockService.getLowStockProducts.mockResolvedValue([]);

      await controller.getLowStockProducts('25');

      expect(mockStockService.getLowStockProducts).toHaveBeenCalledWith(25);
    });

    it('returns low stock products', async () => {
      const lowStock = [{ ...stockQuantStub, availableQuantity: 3 }];
      mockStockService.getLowStockProducts.mockResolvedValue(lowStock);

      const result = await controller.getLowStockProducts('10');

      expect(result.data).toHaveLength(1);
    });
  });

  // ─── GET /inventory/stock/value ─────────────────────────────────────────────

  describe('getStockValue', () => {
    it('returns stock value and product count', async () => {
      mockStockService.getStockValue.mockResolvedValue({
        totalValue: 50000,
        productCount: 120,
      });

      const result = await controller.getStockValue();

      expect(result.data).toEqual({ totalValue: 50000, productCount: 120 });
    });
  });

  // ─── POST /inventory/stock/reserve ──────────────────────────────────────────

  describe('reserveStock', () => {
    it('reserves stock successfully', async () => {
      const reservedQuant = {
        ...stockQuantStub,
        reservedQuantity: 40,
        availableQuantity: 60,
      };
      mockStockService.reserveStock.mockResolvedValue(reservedQuant);

      const result = await controller.reserveStock({
        productId: 1,
        warehouseId: 1,
        quantity: 30,
      });

      expect(mockStockService.reserveStock).toHaveBeenCalledWith(1, 1, 30);
      expect(result.data.reservedQuantity).toBe(40);
    });

    it('propagates BadRequestException on insufficient stock', async () => {
      mockStockService.reserveStock.mockRejectedValue(
        new BadRequestException('Insufficient available stock'),
      );

      await expect(
        controller.reserveStock({
          productId: 1,
          warehouseId: 1,
          quantity: 9999,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── POST /inventory/stock/unreserve ────────────────────────────────────────

  describe('unreserveStock', () => {
    it('releases reserved stock successfully', async () => {
      const unReservedQuant = {
        ...stockQuantStub,
        reservedQuantity: 0,
        availableQuantity: 100,
      };
      mockStockService.unreserveStock.mockResolvedValue(unReservedQuant);

      const result = await controller.unreserveStock({
        productId: 1,
        warehouseId: 1,
        quantity: 10,
      });

      expect(mockStockService.unreserveStock).toHaveBeenCalledWith(1, 1, 10);
      expect(result.data.reservedQuantity).toBe(0);
    });
  });
});
