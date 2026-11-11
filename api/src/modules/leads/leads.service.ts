import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, MoreThan, Repository } from 'typeorm';
import { Lead, LEAD_STATUSES, type LeadStatus } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FilterLeadsDto } from './dto/filter-leads.dto';
import type { LeadListDto } from './dto/lead-response.dto';
import { AdminMailerService } from '../admin-auth/admin-mailer.service';
import { sha256 } from '../admin-auth/admin-crypto';
import {
  renderLeadConfirmation,
  renderTeamNotification,
  type LeadEmailLinks,
} from './emails/lead-emails';

/** A second submission from the same phone within this window updates the first. */
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

export interface LeadContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Landing-page leads. Leads are platform data (master database), never
 * tenant data, so they are read through the `master` connection.
 */
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead, 'master') private readonly repo: Repository<Lead>,
    private readonly mailer: AdminMailerService,
    private readonly config: ConfigService,
  ) {}

  // ─── Public capture ──────────────────────────────────────────────────────

  /**
   * Stores a lead and e-mails the team. A bot that fills the honeypot gets the
   * same answer as a person but nothing is stored.
   */
  async capture(
    dto: CreateLeadDto,
    ctx: LeadContext = {},
  ): Promise<Lead | null> {
    const { website, ...data } = dto;
    if (website) {
      this.logger.warn('Lead dropped: honeypot filled');
      return null;
    }

    const phone = data.phone.replace(/\s+/g, ' ').trim();
    const recent = await this.repo.findOne({
      where: {
        phone,
        createdAt: MoreThan(new Date(Date.now() - DEDUPE_WINDOW_MS)),
      },
      order: { createdAt: 'DESC' },
    });

    const fields: Partial<Lead> = {
      name: data.name,
      company: data.company || null,
      phone,
      email: data.email || null,
      activity: data.activity || null,
      message: data.message || null,
      locale: data.locale ?? 'fr',
      channel: data.channel ?? 'whatsapp',
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmTerm: data.utmTerm || null,
      utmContent: data.utmContent || null,
      referrer: data.referrer || null,
      landingPath: data.landingPath || null,
      ipHash: ctx.ip ? sha256(`lead|${ctx.ip}`) : null,
      userAgent: ctx.userAgent?.slice(0, 300) ?? null,
    };

    // Same person resubmitting within the window (e.g. WhatsApp then e-mail):
    // keep one lead.
    const lead = recent
      ? await this.repo.save(Object.assign(recent, fields))
      : await this.repo.save(this.repo.create(fields));

    if (fields.channel === 'email') {
      // The e-mail *is* the message here: wait for it and tell the visitor if
      // it failed, so the form can offer WhatsApp instead.
      if (!(await this.notify(lead))) {
        throw new ServiceUnavailableException(
          'Your request was saved but the e-mail could not be sent',
        );
      }
    } else if (!recent) {
      void this.notify(lead); // WhatsApp carries the message; e-mail is a copy
    }
    return lead;
  }

  private get links(): LeadEmailLinks {
    const url = (key: string, fallback: string) =>
      (this.config.get<string>(key) || fallback).replace(/\/$/, '');
    return {
      siteUrl: url('LANDING_URL', 'https://mar-nova.com'),
      dashboardUrl: `${url('TENANT_DASHBOARD_URL', 'https://tenants.mar-nova.com')}/leads`,
      whatsapp: this.config.get<string>('CONTACT_WHATSAPP') || '212666473116',
      whatsappDisplay:
        this.config.get<string>('CONTACT_WHATSAPP_DISPLAY') ||
        '+212 6 66 47 31 16',
    };
  }

  /**
   * E-mails the lead to the team and, when the visitor left an address, sends
   * them a branded confirmation. Resolves false when the team e-mail failed
   * (the confirmation is best-effort and never fails the request).
   */
  private async notify(lead: Lead): Promise<boolean> {
    const to = this.config.get<string>('LEADS_NOTIFY_EMAIL');
    if (!to) {
      this.logger.warn(
        `Lead #${lead.id} not e-mailed: LEADS_NOTIFY_EMAIL is not set`,
      );
      return false;
    }
    if (
      !this.mailer.isConfigured &&
      this.config.get<string>('NODE_ENV') === 'production'
    ) {
      this.logger.error(`Lead #${lead.id} not e-mailed: SMTP_HOST is not set`);
      return false;
    }
    const links = this.links;

    try {
      await this.mailer.send({
        to,
        replyTo: lead.email ?? undefined,
        ...renderTeamNotification(lead, links),
      });
    } catch (err) {
      this.logger.error(
        `Lead #${lead.id} notification failed: ${(err as Error).message}`,
      );
      return false;
    }

    if (lead.email) {
      try {
        await this.mailer.send({
          to: lead.email,
          replyTo: to,
          ...renderLeadConfirmation(lead, links),
        });
      } catch (err) {
        this.logger.warn(
          `Lead #${lead.id} confirmation to visitor failed: ${(err as Error).message}`,
        );
      }
    }
    return true;
  }

  // ─── Super-admin management ──────────────────────────────────────────────

  async findAll(filter: FilterLeadsDto): Promise<LeadListDto> {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 20;
    const qb = this.repo.createQueryBuilder('l');
    if (filter.status)
      qb.andWhere('l.status = :status', { status: filter.status });
    if (filter.search) {
      const q = `%${filter.search.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('LOWER(l.name) LIKE :q', { q })
            .orWhere('LOWER(l.company) LIKE :q', { q })
            .orWhere('LOWER(l.email) LIKE :q', { q })
            .orWhere('l.phone LIKE :q', { q }),
        ),
      );
    }
    const [items, total] = await qb
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const raw = await this.repo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('l.status')
      .getRawMany<{ status: LeadStatus; count: number }>();
    const counts = Object.fromEntries(
      LEAD_STATUSES.map((s) => [s, 0]),
    ) as Record<LeadStatus, number>;
    for (const r of raw) counts[r.status] = Number(r.count);

    return {
      items: items.map((l) => this.toAdmin(l)),
      total,
      page,
      pageSize,
      counts,
    };
  }

  async update(id: number, dto: UpdateLeadDto) {
    const lead = await this.repo.findOne({ where: { id } });
    if (!lead) throw new NotFoundException(`Lead ${id} not found`);
    if (dto.status && dto.status !== lead.status) {
      if (lead.status === 'new' && !lead.contactedAt)
        lead.contactedAt = new Date();
      lead.status = dto.status;
    }
    if (dto.notes !== undefined) lead.notes = dto.notes || null;
    return this.toAdmin(await this.repo.save(lead));
  }

  async remove(id: number): Promise<void> {
    const res = await this.repo.delete(id);
    if (!res.affected) throw new NotFoundException(`Lead ${id} not found`);
  }

  /** Drops the abuse-control fields from what the dashboard sees. */
  private toAdmin(lead: Lead) {
    const { ipHash: _ip, userAgent: _ua, ...rest } = lead;
    return rest;
  }
}
