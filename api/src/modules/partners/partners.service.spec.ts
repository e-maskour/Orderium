import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PartnersService } from './partners.service';
import { Partner } from './entities/partner.entity';
import { Portal } from '../portal/entities/portal.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';

const mockRepository = () => ({
  findOne: jest.fn(),
  create: jest.fn((dto: unknown) => dto),
  save: jest.fn(async (entity: unknown) => entity),
});

describe('PartnersService.upsert', () => {
  let service: PartnersService;
  let partnerRepo: ReturnType<typeof mockRepository>;
  let portalRepo: ReturnType<typeof mockRepository>;

  beforeEach(async () => {
    partnerRepo = mockRepository();
    portalRepo = mockRepository();
    const tenantConnService = {
      getRepository: jest.fn((entity: unknown) =>
        entity === Portal ? portalRepo : partnerRepo,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnersService,
        { provide: TenantConnectionService, useValue: tenantConnService },
        { provide: CACHE_MANAGER, useValue: { del: jest.fn() } },
      ],
    }).compile();

    service = module.get(PartnersService);
  });

  it('keeps the customer already linked to the portal account, even when the phone differs', async () => {
    const company = {
      id: 10,
      name: 'Supérette Oasis SARL AU',
      phoneNumber: '0683364348',
      deliveryAddress: 'Ancienne adresse',
    } as Partner;
    portalRepo.findOne.mockResolvedValue({ id: 13, phoneNumber: '0601876597', customerId: 10 });
    partnerRepo.findOne.mockResolvedValue(company);

    const result = await service.upsert(
      {
        phoneNumber: '0601876597',
        name: 'Adil Kettani',
        deliveryAddress: 'Rue Oued Ziz, Casablanca',
        latitude: 33.5,
      } as never,
      '0601876597',
    );

    expect(result.id).toBe(10);
    // Identity of the company partner is preserved…
    expect(result.name).toBe('Supérette Oasis SARL AU');
    expect(result.phoneNumber).toBe('0683364348');
    // …only delivery details are refreshed.
    expect(result.deliveryAddress).toBe('Rue Oued Ziz, Casablanca');
    expect(result.latitude).toBe(33.5);
    expect(partnerRepo.create).not.toHaveBeenCalled();
    // The portal account is not relinked.
    expect(portalRepo.save).not.toHaveBeenCalled();
  });

  it('creates a partner and links the portal account when none is linked yet', async () => {
    portalRepo.findOne.mockResolvedValue({ id: 30, phoneNumber: '0611111111', customerId: null });
    partnerRepo.findOne.mockResolvedValue(null);
    partnerRepo.save.mockImplementation(async (p: Partner) => ({ ...p, id: 99 }));

    const result = await service.upsert(
      { phoneNumber: '0611111111', name: 'Nouveau Client' } as never,
      '0611111111',
    );

    expect(result.id).toBe(99);
    expect(partnerRepo.create).toHaveBeenCalled();
    expect(portalRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 99, isCustomer: true }),
    );
  });
});
