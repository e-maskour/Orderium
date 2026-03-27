import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddShareTokenToInvoicesAndOrders1743000000000 implements MigrationInterface {
  name = 'AddShareTokenToInvoicesAndOrders1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'share_token',
        type: 'varchar',
        length: '100',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'share_token_expiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'share_token',
        type: 'varchar',
        length: '100',
        isNullable: true,
        isUnique: true,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'share_token_expiry',
        type: 'timestamp',
        isNullable: true,
      }),
    );

    await queryRunner.createIndex(
      'invoices',
      new TableIndex({
        name: 'IDX_invoice_share_token',
        columnNames: ['share_token'],
      }),
    );

    await queryRunner.createIndex(
      'orders',
      new TableIndex({
        name: 'IDX_order_share_token',
        columnNames: ['share_token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('orders', 'IDX_order_share_token');
    await queryRunner.dropIndex('invoices', 'IDX_invoice_share_token');
    await queryRunner.dropColumn('orders', 'share_token_expiry');
    await queryRunner.dropColumn('orders', 'share_token');
    await queryRunner.dropColumn('invoices', 'share_token_expiry');
    await queryRunner.dropColumn('invoices', 'share_token');
  }
}
