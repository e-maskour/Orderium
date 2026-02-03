import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeliveryStatusTimestampsToOrders1770000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('orders', [
      new TableColumn({ name: 'pendingAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'assignedAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'confirmedAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'pickedUpAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'toDeliveryAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'inDeliveryAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'deliveredAt', type: 'timestamp', isNullable: true }),
      new TableColumn({ name: 'canceledAt', type: 'timestamp', isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('orders', [
      'pendingAt',
      'assignedAt',
      'confirmedAt',
      'pickedUpAt',
      'toDeliveryAt',
      'inDeliveryAt',
      'deliveredAt',
      'canceledAt',
    ]);
  }
}
