import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { Warehouse } from './entities/warehouse.entity';

// ─── Mock Factory ──────────────────────────────────────────────────────────

const mockRepository = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
});

const mockDataSource = { query: jest.fn() };

// ─── Test Data Factory ────────────────────────────────────────────────────────

const makeWarehouse = (overrides: Partial<Warehouse> = {}): Warehouse =>
({
    id: 1,
    name: 'Main Warehouse',
    code: 'WH-MAIN',
    address: '123 Storage St',
    city: 'Algiers',
    isActive: true,
    ...overrides,
} as Warehouse);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('WarehouseService', () => {
    let service: WarehouseService;
    let warehouseRepo: ReturnType<typeof mockRepository>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WarehouseService,
                { provide: getRepositoryToken(Warehouse), useFactory: mockRepository },
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile();

        service = module.get<WarehouseService>(WarehouseService);
        warehouseRepo = module.get(getRepositoryToken(Warehouse));

        jest.clearAllMocks();
    });

    // ─── create ──────────────────────────────────────────────────────────────────

    describe('create', () => {
        it('creates a warehouse with unique code', async () => {
            warehouseRepo.findOne.mockResolvedValue(null); // no duplicate
            const wh = makeWarehouse();
            warehouseRepo.create.mockReturnValue(wh);
            warehouseRepo.save.mockResolvedValue(wh);

            const result = await service.create({ name: 'Main Warehouse', code: 'WH-MAIN' });

            expect(warehouseRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ code: 'WH-MAIN' }),
            );
            expect(result.code).toBe('WH-MAIN');
        });

        it('throws BadRequestException when code already exists', async () => {
            warehouseRepo.findOne.mockResolvedValue(makeWarehouse()); // duplicate

            await expect(service.create({ name: 'Dup', code: 'WH-MAIN' })).rejects.toThrow(
                BadRequestException,
            );
            await expect(service.create({ name: 'Dup', code: 'WH-MAIN' })).rejects.toThrow(
                "Warehouse with code 'WH-MAIN' already exists",
            );
        });
    });

    // ─── findAll ─────────────────────────────────────────────────────────────────

    describe('findAll', () => {
        it('returns only active warehouses', async () => {
            const warehouses = [makeWarehouse(), makeWarehouse({ id: 2, code: 'WH-SEC' })];
            warehouseRepo.find.mockResolvedValue(warehouses);

            const result = await service.findAll();

            expect(warehouseRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({ where: { isActive: true } }),
            );
            expect(result).toHaveLength(2);
        });

        it('returns empty array when no active warehouses', async () => {
            warehouseRepo.find.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
        });
    });

    // ─── findOne ─────────────────────────────────────────────────────────────────

    describe('findOne', () => {
        it('returns the warehouse for a valid ID', async () => {
            const wh = makeWarehouse();
            warehouseRepo.findOne.mockResolvedValue(wh);

            const result = await service.findOne(1);

            expect(warehouseRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toEqual(wh);
        });

        it('throws NotFoundException for non-existing ID', async () => {
            warehouseRepo.findOne.mockResolvedValue(null);

            await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
            await expect(service.findOne(999)).rejects.toThrow('Warehouse with ID 999 not found');
        });
    });

    // ─── update ──────────────────────────────────────────────────────────────────

    describe('update', () => {
        it('updates warehouse fields', async () => {
            const wh = makeWarehouse();
            warehouseRepo.findOne.mockResolvedValue(wh);
            warehouseRepo.save.mockImplementation((w) => Promise.resolve(w));

            const result = await service.update(1, { name: 'Updated Warehouse' });

            expect(result.name).toBe('Updated Warehouse');
        });

        it('throws BadRequestException when new code already belongs to another warehouse', async () => {
            const existing = makeWarehouse();
            const other = makeWarehouse({ id: 2, code: 'WH-SEC' });
            // First call: findOne for the warehouse being updated
            warehouseRepo.findOne.mockResolvedValueOnce(existing);
            // Second call: check code duplication for the new code
            warehouseRepo.findOne.mockResolvedValueOnce(other);

            await expect(service.update(1, { code: 'WH-SEC' })).rejects.toThrow(BadRequestException);
        });

        it('allows updating to the same code (no-op code change)', async () => {
            const wh = makeWarehouse();
            warehouseRepo.findOne.mockResolvedValue(wh);
            warehouseRepo.save.mockImplementation((w) => Promise.resolve(w));

            // Same code, no duplicate check triggered
            const result = await service.update(1, { code: 'WH-MAIN' });

            expect(result.code).toBe('WH-MAIN');
        });

        it('throws NotFoundException when warehouse does not exist', async () => {
            warehouseRepo.findOne.mockResolvedValue(null);

            await expect(service.update(999, { name: 'X' })).rejects.toThrow(NotFoundException);
        });
    });

    // ─── remove ──────────────────────────────────────────────────────────────────

    describe('remove', () => {
        it('soft-deletes warehouse by setting isActive to false', async () => {
            const wh = makeWarehouse();
            warehouseRepo.findOne.mockResolvedValue(wh);
            warehouseRepo.save.mockImplementation((w) => Promise.resolve(w));

            await service.remove(1);

            expect(wh.isActive).toBe(false);
            expect(warehouseRepo.save).toHaveBeenCalledWith(wh);
        });

        it('throws NotFoundException when warehouse does not exist', async () => {
            warehouseRepo.findOne.mockResolvedValue(null);

            await expect(service.remove(999)).rejects.toThrow(NotFoundException);
        });
    });
});
