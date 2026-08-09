import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ILike } from 'typeorm';
import { PortalService } from './portal.service';
import { Portal } from './entities/portal.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

const mockRepository = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

const mockCacheManager = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
};

const makePortalUser = (overrides: Partial<Portal> = {}): Portal =>
  ({
    id: 1,
    name: 'Ahmed Benali',
    phoneNumber: '0612345678',
    password: '$2b$10$averysecretbcrypthash',
    email: null,
    status: 'pending',
    userType: 'client',
    isAdmin: false,
    isCustomer: true,
    isActive: true,
    customerId: 7,
    customer: { id: 7, name: 'Ahmed Benali' },
    avatarUrl: null,
    dateCreated: new Date('2026-08-01T10:00:00Z'),
    dateUpdated: new Date('2026-08-01T10:00:00Z'),
    ...overrides,
  }) as Portal;

describe('PortalService', () => {
  let service: PortalService;
  let portalRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    portalRepo = mockRepository();

    const mockTenantConnService = {
      getRepository: jest.fn(() => portalRepo),
      getCurrentTenantSlug: jest.fn(() => 'acme'),
      getCurrentDataSource: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PortalService,
        { provide: TenantConnectionService, useValue: mockTenantConnService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<PortalService>(PortalService);
    jest.clearAllMocks();
  });

  describe('findAllUsers', () => {
    it('never exposes the password hash', async () => {
      portalRepo.findAndCount.mockResolvedValue([[makePortalUser()], 1]);

      const result = await service.findAllUsers(1, 20);

      expect(result.total).toBe(1);
      expect(result.data[0]).not.toHaveProperty('password');
      expect(JSON.stringify(result.data)).not.toContain('bcrypthash');
    });

    it('flattens the related partner name onto customerName', async () => {
      portalRepo.findAndCount.mockResolvedValue([[makePortalUser()], 1]);

      const result = await service.findAllUsers(1, 20);

      expect(result.data[0]).toMatchObject({
        id: 1,
        name: 'Ahmed Benali',
        phoneNumber: '0612345678',
        status: 'pending',
        customerId: 7,
        customerName: 'Ahmed Benali',
      });
    });

    it('filters by status and userType, newest first', async () => {
      portalRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllUsers(2, 10, 'pending', undefined, 'client');

      expect(portalRepo.findAndCount).toHaveBeenCalledWith({
        where: { status: 'pending', userType: 'client' },
        relations: ['customer'],
        skip: 10,
        take: 10,
        order: { dateCreated: 'DESC' },
      });
    });

    it('keeps the status and userType filters on every search branch', async () => {
      portalRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllUsers(1, 20, 'pending', 'ahmed', 'client');

      const where = portalRepo.findAndCount.mock.calls[0][0].where;
      expect(where).toEqual([
        {
          status: 'pending',
          userType: 'client',
          phoneNumber: ILike('%ahmed%'),
        },
        { status: 'pending', userType: 'client', name: ILike('%ahmed%') },
      ]);
    });

    it('applies no filter when neither status nor userType is given', async () => {
      portalRepo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAllUsers(1, 20);

      expect(portalRepo.findAndCount.mock.calls[0][0].where).toEqual({});
    });
  });
});
