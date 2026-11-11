import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { LeadsService } from './leads.service';
import type { Lead } from './entities/lead.entity';
import type { AdminMailerService } from '../admin-auth/admin-mailer.service';

function setup(
  recent: Partial<Lead> | null = null,
  send = jest.fn((_message: unknown) => Promise.resolve()),
) {
  const repo = {
    findOne: jest.fn(() => Promise.resolve(recent)),
    create: jest.fn((v: Partial<Lead>) => v),
    save: jest.fn((v: Partial<Lead>) => Promise.resolve({ id: 1, ...v })),
  };
  const mailer = { send } as unknown as AdminMailerService;
  const config = {
    get: (k: string) =>
      k === 'LEADS_NOTIFY_EMAIL' ? 'team@example.com' : undefined,
  } as unknown as ConfigService;
  return {
    service: new LeadsService(repo as never, mailer, config),
    repo,
    send,
  };
}

const lead = {
  name: 'Youssef Alaoui',
  phone: '06 61  23 45 67',
  company: 'Al Amal',
};

describe('LeadsService.capture', () => {
  it('stores the lead without the raw IP and e-mails the team', async () => {
    const { service, repo, send } = setup();
    await service.capture(lead as never, { ip: '10.0.0.1', userAgent: 'UA' });
    const saved = repo.save.mock.calls[0][0];
    expect(saved.phone).toBe('06 61 23 45 67');
    expect(saved.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(saved)).not.toContain('10.0.0.1');
    await new Promise((r) => setImmediate(r));
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'team@example.com',
        subject: expect.stringContaining('Youssef'),
      }),
    );
  });

  it('drops honeypot submissions silently', async () => {
    const { service, repo } = setup();
    await expect(
      service.capture({ ...lead, website: 'spam' } as never),
    ).resolves.toBeNull();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('merges a WhatsApp resubmission without e-mailing again', async () => {
    const existing = {
      id: 5,
      name: 'Youssef',
      phone: '06 61 23 45 67',
      channel: 'whatsapp',
    } as Lead;
    const { service, repo, send } = setup(existing);
    await service.capture({ ...lead, channel: 'whatsapp' } as never);
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, channel: 'whatsapp' }),
    );
    await new Promise((r) => setImmediate(r));
    expect(send).not.toHaveBeenCalled();
  });

  it('always e-mails an e-mail submission, even when merged', async () => {
    const existing = { id: 5, phone: '06 61 23 45 67' } as Lead;
    const { service, repo, send } = setup(existing);
    await service.capture({ ...lead, channel: 'email' } as never);
    expect(repo.create).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('reports a failed e-mail submission so the visitor can use WhatsApp', async () => {
    const failing = jest.fn((_message: unknown) =>
      Promise.reject(new Error('SMTP down')),
    );
    const { service, repo } = setup(null, failing);
    await expect(
      service.capture({ ...lead, channel: 'email' } as never),
    ).rejects.toThrow(ServiceUnavailableException);
    expect(repo.save).toHaveBeenCalled(); // the lead is still kept
  });

  it('confirms receipt to the visitor in their language', async () => {
    const { service, send } = setup();
    await service.capture({
      ...lead,
      email: 'youssef@example.ma',
      locale: 'ar',
      channel: 'email',
    } as never);
    expect(send).toHaveBeenCalledTimes(2);
    const [team, visitor] = send.mock.calls.map(
      (c) =>
        c[0] as never as {
          to: string;
          replyTo?: string;
          subject: string;
          html: string;
          attachments: { cid: string }[];
        },
    );
    expect(team).toMatchObject({
      to: 'team@example.com',
      replyTo: 'youssef@example.ma',
    });
    expect(visitor.to).toBe('youssef@example.ma');
    expect(visitor.replyTo).toBe('team@example.com');
    expect(visitor.subject).toContain('مارنوفا');
    expect(visitor.html).toContain('dir="rtl"');
    expect(visitor.html).toContain(`cid:${visitor.attachments[0].cid}`);
  });

  it('escapes visitor input in the e-mails', async () => {
    const { service, send } = setup();
    await service.capture({
      ...lead,
      name: '<script>x</script>',
      channel: 'email',
    } as never);
    const html = (send.mock.calls[0][0] as never as { html: string }).html;
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
