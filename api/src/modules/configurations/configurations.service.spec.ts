import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigurationsService } from './configurations.service';

const OLD_URL = 'http://minio/orderium-demo/company/old.webp';
const NEW_URL = 'http://minio/orderium-demo/company/new.webp';

function setup(logo: string = OLD_URL) {
  const config = {
    id: 7,
    entity: 'my_company',
    values: { companyName: 'Acme', logo },
  };
  const repo = {
    findOne: jest.fn().mockResolvedValue(config),
    save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
  };
  const tenantConnService = {
    getRepository: jest.fn().mockReturnValue(repo),
    getCurrentTenantSlug: jest.fn().mockReturnValue('demo'),
  };
  const minio = {
    isConfigured: jest.fn().mockReturnValue(true),
    upload: jest.fn().mockResolvedValue({ url: NEW_URL, publicId: 'x' }),
    delete: jest.fn().mockResolvedValue(undefined),
    objectKeyFromUrl: jest.fn((url?: string) =>
      url?.startsWith('http://minio/orderium-demo/')
        ? url.slice('http://minio/orderium-demo/'.length)
        : null,
    ),
  };
  const cache = {
    get: jest.fn().mockResolvedValue(undefined),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ConfigurationsService(
    tenantConnService as any,
    minio as any,
    cache as any,
  );
  return { service, repo, minio };
}

const file = { buffer: Buffer.from('img'), mimetype: 'image/png' } as any;

describe('ConfigurationsService company logo', () => {
  it('stores the new logo, keeps other fields and deletes the old file', async () => {
    const { service, minio, repo } = setup();

    const values = await service.setCompanyLogo(file);

    expect(minio.upload).toHaveBeenCalledWith(file, 'company');
    expect(values).toEqual({ companyName: 'Acme', logo: NEW_URL });
    expect(repo.save).toHaveBeenCalled();
    expect(minio.delete).toHaveBeenCalledWith('company/old.webp');
  });

  it('does not try to delete a previous base64 logo', async () => {
    const { service, minio } = setup('data:image/png;base64,AAAA');

    await service.setCompanyLogo(file);

    expect(minio.delete).not.toHaveBeenCalled();
  });

  it('still succeeds when deleting the old file fails', async () => {
    const { service, minio } = setup();
    minio.delete.mockRejectedValueOnce(new Error('gone'));

    await expect(service.setCompanyLogo(file)).resolves.toMatchObject({
      logo: NEW_URL,
    });
  });

  it('refuses uploads when storage is not configured', async () => {
    const { service, minio } = setup();
    minio.isConfigured.mockReturnValue(false);

    await expect(service.setCompanyLogo(file)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(minio.upload).not.toHaveBeenCalled();
  });

  it('removes the logo and its stored file', async () => {
    const { service, minio } = setup();

    const values = await service.removeCompanyLogo();

    expect(values).toEqual({ companyName: 'Acme', logo: '' });
    expect(minio.delete).toHaveBeenCalledWith('company/old.webp');
  });
});
