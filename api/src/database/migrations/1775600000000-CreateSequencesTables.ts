import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Creates the `sequences` table and `sequence_audit_log` table.
 *
 * These replace the JSON blob previously stored in the `configurations` table
 * under entity = 'sequences'. The atomic counter guarantees no duplicate
 * document numbers under concurrent load.
 */
export class CreateSequencesTables1775600000000 implements MigrationInterface {
  name = 'CreateSequencesTables1775600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── sequences ────────────────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sequences',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'prefix',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "''",
          },
          {
            name: 'suffix',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "''",
          },
          {
            name: 'number_length',
            type: 'int',
            isNullable: false,
            default: 4,
          },
          {
            name: 'year_in_format',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'month_in_format',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'day_in_format',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'trimester_in_format',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'format_template',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'reset_period',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'yearly'",
          },
          {
            name: 'current_period_key',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'next_number',
            type: 'int',
            isNullable: false,
            default: 1,
          },
          {
            name: 'is_active',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'last_generated_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'last_reset_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
        ],
        indices: [
          {
            name: 'UQ_sequences_entity_type',
            columnNames: ['entity_type'],
            isUnique: true,
          },
          {
            name: 'IDX_sequences_entity_type',
            columnNames: ['entity_type'],
          },
        ],
        checks: [
          {
            name: 'CHK_sequences_reset_period',
            expression: `reset_period IN ('never', 'daily', 'monthly', 'yearly')`,
          },
        ],
      }),
      true,
    );

    // ── sequence_audit_log ───────────────────────────────────────────────────
    await queryRunner.createTable(
      new Table({
        name: 'sequence_audit_log',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'sequence_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'assigned_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'document_number',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'period_key',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'generated_at',
            type: 'timestamptz',
            isNullable: false,
            default: 'NOW()',
          },
          {
            name: 'generated_by',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
        ],
        indices: [
          {
            name: 'IDX_seq_audit_entity_type',
            columnNames: ['entity_type'],
          },
          {
            name: 'IDX_seq_audit_document_number',
            columnNames: ['document_number'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('sequence_audit_log', true);
    await queryRunner.dropTable('sequences', true);
  }
}
