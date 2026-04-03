import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class OrderPayments1774800000000 implements MigrationInterface {
  name = 'OrderPayments1774800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop order_id column from payments (if it exists)
    const paymentsTable = await queryRunner.getTable('payments');
    if (paymentsTable) {
      const orderIdFk = paymentsTable.foreignKeys.find(
        (fk) =>
          fk.columnNames.includes('orderId') ||
          fk.columnNames.includes('order_id'),
      );
      if (orderIdFk) {
        await queryRunner.dropForeignKey('payments', orderIdFk);
      }
      const hasOrderId = paymentsTable.columns.some(
        (c) => c.name === 'orderId' || c.name === 'order_id',
      );
      if (hasOrderId) {
        await queryRunner.dropColumn(
          'payments',
          paymentsTable.columns.find(
            (c) => c.name === 'orderId' || c.name === 'order_id',
          )!.name,
        );
      }
    }

    // 2. Add paidAmount and remainingAmount to the orders table (if they don't exist)
    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable) {
      const hasPaidAmount = ordersTable.columns.some(
        (c) => c.name === 'paidAmount',
      );
      if (!hasPaidAmount) {
        await queryRunner.addColumn(
          'orders',
          new TableColumn({
            name: 'paidAmount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
            isNullable: false,
          }),
        );
      }
      const hasRemainingAmount = ordersTable.columns.some(
        (c) => c.name === 'remainingAmount',
      );
      if (!hasRemainingAmount) {
        await queryRunner.addColumn(
          'orders',
          new TableColumn({
            name: 'remainingAmount',
            type: 'decimal',
            precision: 18,
            scale: 2,
            default: 0,
            isNullable: false,
          }),
        );
      }
    }

    // 3. Create order_payments table
    const orderPaymentsExists = await queryRunner.getTable('order_payments');
    if (!orderPaymentsExists) {
      await queryRunner.createTable(
        new Table({
          name: 'order_payments',
          columns: [
            {
              name: 'id',
              type: 'int',
              isPrimary: true,
              isGenerated: true,
              generationStrategy: 'increment',
            },
            {
              name: 'orderId',
              type: 'int',
              isNullable: false,
            },
            {
              name: 'customerId',
              type: 'int',
              isNullable: true,
            },
            {
              name: 'amount',
              type: 'decimal',
              precision: 18,
              scale: 2,
            },
            {
              name: 'paymentDate',
              type: 'date',
            },
            {
              name: 'paymentType',
              type: 'enum',
              enum: [
                'cash',
                'check',
                'bank_transfer',
                'credit_card',
                'mobile_payment',
                'other',
              ],
              default: `'cash'`,
            },
            {
              name: 'notes',
              type: 'text',
              isNullable: true,
            },
            {
              name: 'referenceNumber',
              type: 'varchar',
              length: '100',
              isNullable: true,
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

      await queryRunner.createForeignKey(
        'order_payments',
        new TableForeignKey({
          columnNames: ['orderId'],
          referencedTableName: 'orders',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );

      await queryRunner.createForeignKey(
        'order_payments',
        new TableForeignKey({
          columnNames: ['customerId'],
          referencedTableName: 'partners',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
        }),
      );

      await queryRunner.createIndex(
        'order_payments',
        new TableIndex({ columnNames: ['orderId'] }),
      );

      await queryRunner.createIndex(
        'order_payments',
        new TableIndex({ columnNames: ['customerId'] }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_payments', true);

    const ordersTable = await queryRunner.getTable('orders');
    if (ordersTable) {
      const hasPaidAmount = ordersTable.columns.some(
        (c) => c.name === 'paidAmount',
      );
      if (hasPaidAmount) await queryRunner.dropColumn('orders', 'paidAmount');
      const hasRemainingAmount = ordersTable.columns.some(
        (c) => c.name === 'remainingAmount',
      );
      if (hasRemainingAmount)
        await queryRunner.dropColumn('orders', 'remainingAmount');
    }
  }
}
