import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Sequence } from './entities/sequence.entity';
import { SequenceAuditLog } from './entities/sequence-audit-log.entity';
import { TenantConnectionService } from '../tenant/tenant-connection.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { computePeriodKey, computeEffectivePeriodKey } from './helpers/compute-period-key';
import {
  formatDocumentNumber,
  buildFormatTemplate,
} from './helpers/format-document-number';

/**
 * Default sequence definitions seeded for every new tenant.
 * These are merged with a computed `currentPeriodKey` at seed time.
 */
export const DEFAULT_SEQUENCES: Omit<
  Sequence,
  'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedAt' | 'lastResetAt'
>[] = [
    {
      entityType: 'invoice_sale',
      name: 'Factures de vente',
      prefix: 'FA',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'FA-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '', // set at seed time
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'invoice_purchase',
      name: "Factures d'achat",
      prefix: 'PA',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'PA-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'quote',
      name: 'Devis',
      prefix: 'DV',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'DV-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'delivery_note',
      name: 'Bons de livraison',
      prefix: 'BL',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'BL-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'purchase_order',
      name: "Bons d'achat",
      prefix: 'BA',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'BA-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'payment',
      name: 'Paiements',
      prefix: 'PAY',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'PAY-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'receipt',
      name: 'Reçu',
      prefix: '',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: true,
      trimesterInFormat: false,
      formatTemplate: 'YYYY-MM-DD-XXXX',
      resetPeriod: 'daily',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'order',
      name: 'Commandes POS',
      prefix: 'CMD',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'CMD-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
    {
      entityType: 'price_request',
      name: 'Demandes de prix',
      prefix: 'DP',
      suffix: '',
      numberLength: 4,
      yearInFormat: true,
      monthInFormat: true,
      dayInFormat: false,
      trimesterInFormat: false,
      formatTemplate: 'DP-YYYY-MM-XXXX',
      resetPeriod: 'monthly',
      currentPeriodKey: '',
      nextNumber: 1,
      isActive: true,
    },
  ];

@Injectable()
export class SequencesService {
  private readonly logger = new Logger(SequencesService.name);

  constructor(private readonly tenantConnService: TenantConnectionService) { }

  private get repo(): Repository<Sequence> {
    return this.tenantConnService.getRepository(Sequence);
  }

  private get auditRepo(): Repository<SequenceAuditLog> {
    return this.tenantConnService.getRepository(SequenceAuditLog);
  }

  // ─── Core: atomic number generation ──────────────────────────────────────

  /**
   * Generates the next document number for the given entity type.
   *
   * Guarantees:
   * - Atomically increments the counter via a single UPDATE … RETURNING statement
   * - Automatically resets the counter when the period changes (monthly/yearly/daily)
   * - Writes a record to the audit log
   * - Thread-safe: no read-modify-write race condition possible
   *
   * @param entityType  e.g. 'invoice_sale', 'order'
   * @param options.date         The document date (defaults to now)
   * @param options.generatedBy  Portal user ID for the audit log (optional)
   * @param options.metadata     Extra data to store in the audit log (optional)
   */
  async generateNext(
    entityType: string,
    options: {
      date?: Date;
      generatedBy?: number;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<string> {
    const now = options.date ?? new Date();

    // Run inside an explicit transaction with a row-level lock so no two
    // concurrent requests can assign the same counter value.
    const ds = this.tenantConnService.getCurrentDataSource();
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    let assignedNumber: number;
    let sequence: Sequence;

    try {
      // Lock the row exclusively for the duration of this transaction.
      const rows: Sequence[] = await qr.query(
        `SELECT * FROM sequences WHERE entity_type = $1 AND is_active = true FOR UPDATE`,
        [entityType],
      );

      if (!rows.length) {
        throw new NotFoundException(
          `No active sequence found for entity type '${entityType}'. ` +
          `Run the sequences seeder or create it via the admin API.`,
        );
      }

      // Pick the first matching row and map snake_case → camelCase manually
      // (raw query doesn't go through TypeORM's column mapping).
      const raw = rows[0] as unknown as Record<string, unknown>;
      sequence = {
        id: String(raw['id']),
        entityType: String(raw['entity_type']),
        name: String(raw['name']),
        prefix: String(raw['prefix'] ?? ''),
        suffix: String(raw['suffix'] ?? ''),
        numberLength: Number(raw['number_length'] ?? 4),
        yearInFormat: Boolean(raw['year_in_format']),
        monthInFormat: Boolean(raw['month_in_format']),
        dayInFormat: Boolean(raw['day_in_format']),
        trimesterInFormat: Boolean(raw['trimester_in_format']),
        formatTemplate: String(raw['format_template'] ?? ''),
        resetPeriod: String(raw['reset_period'] ?? 'yearly'),
        currentPeriodKey: String(raw['current_period_key'] ?? ''),
        nextNumber: Number(raw['next_number'] ?? 1),
        isActive: Boolean(raw['is_active']),
        lastGeneratedAt: raw['last_generated_at'] as Date | null,
        lastResetAt: raw['last_reset_at'] as Date | null,
        createdAt: raw['created_at'] as Date,
        updatedAt: raw['updated_at'] as Date,
      } as Sequence;

      const newPeriodKey = computeEffectivePeriodKey(
        sequence.resetPeriod,
        {
          dayInFormat: sequence.dayInFormat,
          monthInFormat: sequence.monthInFormat,
          trimesterInFormat: sequence.trimesterInFormat,
        },
        now,
      );
      const storedKey = sequence.currentPeriodKey;

      // A "real" period change means the date has actually rolled into a new
      // period boundary (new month, day, year, etc.).
      //
      // Special case — format upgrade migration:
      // If the stored key is a strict prefix of the new key (e.g., stored
      // '2026' vs new '2026-04'), the sequence was previously using a coarser
      // period (yearly) but now runs with a finer effective period (monthly).
      // This is NOT a real period change — don't reset the counter mid-period.
      // The key is simply updated to the finer-grained value.
      const isFormatUpgrade = !!storedKey && newPeriodKey.startsWith(storedKey + '-');

      // A forward period advance: new key is lexicographically after the stored
      // key (e.g. '2026-05' > '2026-04'). Lexicographic comparison works for
      // all our date-based keys (YYYY, YYYY-MM, YYYY-MM-DD, YYYY-Qn).
      const isPeriodAdvance =
        !!storedKey &&
        newPeriodKey !== storedKey &&
        !isFormatUpgrade &&
        newPeriodKey > storedKey;

      // Back-dated document: document date is in a past period relative to the
      // sequence's current state (e.g., creating an April doc when the sequence
      // is already at May). We MUST NOT reset the counter or the stored period
      // key — doing so would re-issue a number that already exists.
      // Instead, just continue from the current counter and format the number
      // with the document's own date (so the month in the number is correct).
      const isBackDated =
        !!storedKey &&
        newPeriodKey !== storedKey &&
        !isFormatUpgrade &&
        newPeriodKey < storedKey;

      if (isPeriodAdvance) {
        assignedNumber = 1;
        await qr.query(
          `UPDATE sequences
           SET next_number = 2,
               current_period_key = $1,
               last_generated_at  = NOW(),
               last_reset_at      = NOW(),
               updated_at         = NOW()
           WHERE entity_type = $2 AND is_active = true`,
          [newPeriodKey, entityType],
        );
      } else if (isBackDated) {
        // Increment from the current counter but keep current_period_key intact
        // so that the forward period boundary is preserved for future documents.
        assignedNumber = sequence.nextNumber;
        await qr.query(
          `UPDATE sequences
           SET next_number = $1,
               last_generated_at  = NOW(),
               updated_at         = NOW()
           WHERE entity_type = $2 AND is_active = true`,
          [sequence.nextNumber + 1, entityType],
        );
      } else {
        assignedNumber = sequence.nextNumber;
        await qr.query(
          `UPDATE sequences
           SET next_number = $1,
               current_period_key = $2,
               last_generated_at  = NOW(),
               updated_at         = NOW()
           WHERE entity_type = $3 AND is_active = true`,
          [sequence.nextNumber + 1, newPeriodKey, entityType],
        );
      }

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    const documentNumber = formatDocumentNumber(
      sequence.prefix,
      sequence.suffix,
      assignedNumber,
      sequence.numberLength,
      now,
      {
        year: sequence.yearInFormat,
        month: sequence.monthInFormat,
        day: sequence.dayInFormat,
        trimester: sequence.trimesterInFormat,
      },
    );

    this.writeAuditLog({
      sequenceId: sequence.id,
      entityType,
      assignedNumber,
      documentNumber,
      periodKey: computeEffectivePeriodKey(
        sequence.resetPeriod,
        {
          dayInFormat: sequence.dayInFormat,
          monthInFormat: sequence.monthInFormat,
          trimesterInFormat: sequence.trimesterInFormat,
        },
        now,
      ),
      generatedBy: options.generatedBy ?? null,
      metadata: options.metadata ?? null,
    }).catch((err: unknown) => {
      this.logger.error(
        'Failed to write sequence audit log',
        (err as Error)?.stack,
      );
    });

    return documentNumber;
  }

  /**
   * Returns a preview of what the next document number WOULD be.
   * Does NOT increment the counter.
   * NOT guaranteed to be the actual next number under concurrent load.
   */
  async getPreview(entityType: string, date?: Date): Promise<string> {
    const sequence = await this.findActiveOrFail(entityType);
    const now = date ?? new Date();
    const periodKey = computeEffectivePeriodKey(
      sequence.resetPeriod,
      {
        dayInFormat: sequence.dayInFormat,
        monthInFormat: sequence.monthInFormat,
        trimesterInFormat: sequence.trimesterInFormat,
      },
      now,
    );

    // If period has rolled over, the next number will be 1
    const nextNum =
      periodKey !== sequence.currentPeriodKey ? 1 : sequence.nextNumber;

    return formatDocumentNumber(
      sequence.prefix,
      sequence.suffix,
      nextNum,
      sequence.numberLength,
      now,
      {
        year: sequence.yearInFormat,
        month: sequence.monthInFormat,
        day: sequence.dayInFormat,
        trimester: sequence.trimesterInFormat,
      },
    );
  }

  // ─── Admin: manual counter reset ──────────────────────────────────────────

  /**
   * Releases (rolls back) a sequence number when its document is deleted or devalidated.
   *
   * The decrement is ONLY applied when the document being released was the last
   * number issued in the current period. This prevents gaps from building up
   * when the last document in a sequence is removed.
   *
   * Safe under concurrent load: the UPDATE uses a precise WHERE clause so only
   * one concurrent call can "win" the decrement — the rest are no-ops.
   *
   * @param entityType     The sequence type (e.g. 'quote', 'invoice_sale')
   * @param documentNumber The formatted number of the document being released
   *                       (e.g. 'DV-2026-04-0003'). PROV numbers are ignored.
   */
  async releaseNumber(
    entityType: string,
    documentNumber: string,
  ): Promise<void> {
    // PROV documents were never assigned a real sequence number — nothing to do.
    if (!documentNumber || documentNumber.startsWith('PROV')) return;

    const seq = await this.repo.findOne({ where: { entityType } });
    if (!seq || seq.nextNumber <= 1) return;

    // Extract the counter by position using the format template.
    // e.g. template 'DV-YYYY-MM-XXXX', document 'DV-2026-04-0001'
    // → split both by '-', find the 'XXXX' segment index, read the doc segment at that index.
    // This avoids regex ambiguity when year (2026) and counter (0001) are the same digit length.
    let assignedCounter: number | undefined;

    if (seq.formatTemplate) {
      const templateParts = seq.formatTemplate.split('-');
      const counterIdx = templateParts.findIndex((p) => /^X+$/.test(p));
      if (counterIdx !== -1) {
        const docParts = documentNumber.split('-');
        if (docParts[counterIdx] !== undefined) {
          const parsed = parseInt(docParts[counterIdx], 10);
          if (!isNaN(parsed)) assignedCounter = parsed;
        }
      }
    }

    // Fallback: last segment that is entirely digits with correct length
    if (assignedCounter === undefined) {
      const parts = documentNumber.split('-');
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(parts[i]) && parts[i].length === seq.numberLength) {
          assignedCounter = parseInt(parts[i], 10);
          break;
        }
      }
    }

    if (assignedCounter === undefined) {
      this.logger.warn(
        `releaseNumber: could not extract counter from '${documentNumber}' (entityType=${entityType})`,
      );
      return;
    }

    // Atomically decrement only when:
    //  - The period has not changed since this number was issued
    //  - This document holds the last-issued counter (nextNumber - 1 === assignedCounter)
    // The WHERE guards prevent any accidental decrement under concurrent load.
    const updated: Array<{ next_number: number }> = await this.repo.query(
      `UPDATE sequences
       SET next_number = next_number - 1,
           updated_at  = NOW()
       WHERE entity_type        = $1
         AND current_period_key = $2
         AND next_number > 1
         AND next_number - 1    = $3
       RETURNING next_number`,
      [entityType, seq.currentPeriodKey, assignedCounter],
    );

    // Normalise the same [rows[], metadata] wrapping
    const updatedRows: Array<{ next_number: number }> = Array.isArray(updated[0])
      ? updated[0]
      : updated;

    if (updatedRows.length) {
      this.logger.log(
        `Sequence '${entityType}' rolled back: ${assignedCounter + 1} → ${updatedRows[0].next_number}`,
      );
    }
  }

  /**
   * Manually resets a sequence counter (admin action).
   * Logs the reset in the audit trail.
   *
   * @param entityType  The sequence to reset
   * @param resetTo     The value to start from next (defaults to 1)
   */
  async resetCounter(
    entityType: string,
    resetTo = 1,
    operatorId?: number,
  ): Promise<void> {
    const sequence = await this.findActiveOrFail(entityType);
    const now = new Date();
    const periodKey = computeEffectivePeriodKey(
      sequence.resetPeriod,
      {
        dayInFormat: sequence.dayInFormat,
        monthInFormat: sequence.monthInFormat,
        trimesterInFormat: sequence.trimesterInFormat,
      },
      now,
    );

    await this.repo.update(
      { entityType },
      {
        nextNumber: resetTo,
        currentPeriodKey: periodKey,
        lastResetAt: now,
      },
    );

    await this.writeAuditLog({
      sequenceId: sequence.id,
      entityType,
      assignedNumber: 0,
      documentNumber: `RESET→${resetTo}`,
      periodKey,
      generatedBy: operatorId ?? null,
      metadata: { action: 'manual_reset', resetTo },
    });
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async findAll(): Promise<Sequence[]> {
    return this.repo.find({ order: { entityType: 'ASC' } });
  }

  async findOne(id: string): Promise<Sequence> {
    const seq = await this.repo.findOne({ where: { id } });
    if (!seq) throw new NotFoundException(`Sequence '${id}' not found`);
    return seq;
  }

  async findByEntityType(entityType: string): Promise<Sequence> {
    const seq = await this.repo.findOne({ where: { entityType } });
    if (!seq)
      throw new NotFoundException(`Sequence for '${entityType}' not found`);
    return seq;
  }

  async create(dto: CreateSequenceDto): Promise<Sequence> {
    const exists = await this.repo.findOne({
      where: { entityType: dto.entityType },
    });
    if (exists) {
      throw new ConflictException(
        `Sequence for '${dto.entityType}' already exists`,
      );
    }
    const now = new Date();
    const resetPeriod = dto.resetPeriod ?? 'yearly';
    const dayInFormat = dto.dayInFormat ?? false;
    const monthInFormatCreate = dto.monthInFormat ?? true;
    const trimesterInFormatCreate = dto.trimesterInFormat ?? false;
    const periodKey = computeEffectivePeriodKey(
      resetPeriod,
      { dayInFormat, monthInFormat: monthInFormatCreate, trimesterInFormat: trimesterInFormatCreate },
      now,
    );

    const seq = this.repo.create({
      ...dto,
      prefix: dto.prefix?.trim() ?? '',
      suffix: dto.suffix?.trim() ?? '',
      numberLength: dto.numberLength ?? 4,
      yearInFormat: dto.yearInFormat ?? true,
      monthInFormat: dto.monthInFormat ?? true,
      dayInFormat: dto.dayInFormat ?? false,
      trimesterInFormat: dto.trimesterInFormat ?? false,
      formatTemplate:
        dto.formatTemplate ??
        buildFormatTemplate({
          prefix: dto.prefix?.trim() ?? '',
          suffix: dto.suffix?.trim() ?? '',
          numberLength: dto.numberLength ?? 4,
          yearInFormat: dto.yearInFormat ?? true,
          monthInFormat: dto.monthInFormat ?? true,
          dayInFormat: dto.dayInFormat ?? false,
          trimesterInFormat: dto.trimesterInFormat ?? false,
        }),
      resetPeriod,
      currentPeriodKey: periodKey,
      nextNumber: 1,
      isActive: true,
    });
    return this.repo.save(seq);
  }

  async update(id: string, dto: UpdateSequenceDto): Promise<Sequence> {
    const seq = await this.findOne(id);
    const now = new Date();

    // Recompute the period key whenever resetPeriod changes OR nextNumber is
    // being explicitly set. This prevents a format mismatch (e.g. '2026-04'
    // stored for a sequence that just switched from monthly→yearly) from
    // triggering a false counter reset on the next document generation.
    const newResetPeriod = dto.resetPeriod ?? seq.resetPeriod;
    if (dto.nextNumber !== undefined || dto.resetPeriod !== undefined) {
      // Use effective period key so that a format with 'MM' always
      // stores a monthly key — keeps generateNext in sync.
      const newDayInFormat = dto.dayInFormat ?? seq.dayInFormat;
      const newMonthInFormat = dto.monthInFormat ?? seq.monthInFormat;
      const newTrimesterInFormat = dto.trimesterInFormat ?? seq.trimesterInFormat;
      seq.currentPeriodKey = computeEffectivePeriodKey(
        newResetPeriod,
        { dayInFormat: newDayInFormat, monthInFormat: newMonthInFormat, trimesterInFormat: newTrimesterInFormat },
        now,
      );
      if (dto.nextNumber !== undefined) {
        seq.lastResetAt = now;
      }
    }

    // Rebuild formatTemplate if format-related fields changed
    const prefix = (dto.prefix?.trim() ?? seq.prefix).trim();
    const suffix = (dto.suffix?.trim() ?? seq.suffix).trim();
    const numberLength = dto.numberLength ?? seq.numberLength;
    const yearInFormat = dto.yearInFormat ?? seq.yearInFormat;
    const monthInFormat = dto.monthInFormat ?? seq.monthInFormat;
    const dayInFormat = dto.dayInFormat ?? seq.dayInFormat;
    const trimesterInFormat = dto.trimesterInFormat ?? seq.trimesterInFormat;

    Object.assign(seq, dto, {
      prefix,
      suffix,
      formatTemplate: buildFormatTemplate({
        prefix,
        suffix,
        numberLength,
        yearInFormat,
        monthInFormat,
        dayInFormat,
        trimesterInFormat,
      }),
    });

    return this.repo.save(seq);
  }

  // ─── Seed helper (used by tenant onboarding) ──────────────────────────────

  /**
   * Idempotently seeds default sequences for a tenant.
   * Skips entity types that already have a row.
   */
  async seedDefaults(): Promise<void> {
    const now = new Date();
    for (const def of DEFAULT_SEQUENCES) {
      const exists = await this.repo.findOne({
        where: { entityType: def.entityType },
      });
      if (exists) continue;

      await this.repo.save(
        this.repo.create({
          ...def,
          currentPeriodKey: computeEffectivePeriodKey(
            def.resetPeriod,
            { dayInFormat: def.dayInFormat, monthInFormat: def.monthInFormat, trimesterInFormat: def.trimesterInFormat },
            now,
          ),
        }),
      );
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findActiveOrFail(entityType: string): Promise<Sequence> {
    const seq = await this.repo.findOne({
      where: { entityType, isActive: true },
    });
    if (!seq) {
      // Auto-seed if the sequence is one of the known defaults
      const defaultDef = DEFAULT_SEQUENCES.find(
        (d) => d.entityType === entityType,
      );
      if (defaultDef) {
        this.logger.warn(`Auto-creating missing sequence for '${entityType}'`);
        const now = new Date();
        const created = await this.repo.save(
          this.repo.create({
            ...defaultDef,
            currentPeriodKey: computeEffectivePeriodKey(
              defaultDef.resetPeriod,
              { dayInFormat: defaultDef.dayInFormat, monthInFormat: defaultDef.monthInFormat, trimesterInFormat: defaultDef.trimesterInFormat },
              now,
            ),
          }),
        );
        return created;
      }
      throw new NotFoundException(
        `No active sequence found for entity type '${entityType}'`,
      );
    }


    return seq;
  }

  private async writeAuditLog(entry: {
    sequenceId: string;
    entityType: string;
    assignedNumber: number;
    documentNumber: string;
    periodKey: string;
    generatedBy: number | null;
    metadata: Record<string, unknown> | null;
  }): Promise<void> {
    const log = this.auditRepo.create(entry);
    await this.auditRepo.save(log);
  }
}
