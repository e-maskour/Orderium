import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateDeviceTokensTable1738800000000 implements MigrationInterface {
  name = 'CreateDeviceTokensTable1738800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
      CREATE TYPE "device_platform_enum" AS ENUM ('web', 'android', 'ios')
    `);

    await queryRunner.query(`
      CREATE TYPE "app_type_enum" AS ENUM ('client', 'backoffice', 'delivery')
    `);

    // Create device_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'device_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'userId',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'token',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'platform',
            type: 'device_platform_enum',
            default: "'web'",
          },
          {
            name: 'appType',
            type: 'app_type_enum',
            isNullable: false,
          },
          {
            name: 'deviceName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'browserName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'osName',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'lastUsedAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'dateCreated',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'dateUpdated',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create unique constraint on token
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'UQ_device_tokens_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_platform',
        columnNames: ['platform'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_appType',
        columnNames: ['appType'],
      }),
    );

    await queryRunner.createIndex(
      'device_tokens',
      new TableIndex({
        name: 'IDX_device_tokens_isActive',
        columnNames: ['isActive'],
      }),
    );

    // Create foreign key
    await queryRunner.createForeignKey(
      'device_tokens',
      new TableForeignKey({
        name: 'FK_device_tokens_portal',
        columnNames: ['userId'],
        referencedTableName: 'portal',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey(
      'device_tokens',
      'FK_device_tokens_portal',
    );

    // Drop indexes
    await queryRunner.dropIndex('device_tokens', 'IDX_device_tokens_isActive');
    await queryRunner.dropIndex('device_tokens', 'IDX_device_tokens_appType');
    await queryRunner.dropIndex('device_tokens', 'IDX_device_tokens_platform');
    await queryRunner.dropIndex('device_tokens', 'IDX_device_tokens_userId');
    await queryRunner.dropIndex('device_tokens', 'UQ_device_tokens_token');

    // Drop table
    await queryRunner.dropTable('device_tokens');

    // Drop enum types
    await queryRunner.query(`DROP TYPE "app_type_enum"`);
    await queryRunner.query(`DROP TYPE "device_platform_enum"`);
  }
}
