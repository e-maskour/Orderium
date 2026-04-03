import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateNotificationTemplates1775000000000 implements MigrationInterface {
  name = 'CreateNotificationTemplates1775000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'notification_templates',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'key', type: 'varchar', length: '100', isUnique: true },
          { name: 'category', type: 'varchar', length: '50' },
          { name: 'portal', type: 'varchar', length: '50' },
          { name: 'title_fr', type: 'varchar', length: '255' },
          { name: 'body_fr', type: 'text' },
          {
            name: 'title_ar',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          { name: 'body_ar', type: 'text', isNullable: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'enabled', type: 'boolean', default: true },
          {
            name: 'priority',
            type: 'varchar',
            length: '20',
            default: `'MEDIUM'`,
          },
          {
            name: 'date_created',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'date_updated',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'notification_templates',
      new TableIndex({
        name: 'IDX_notification_templates_category',
        columnNames: ['category'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('notification_templates');
  }
}
