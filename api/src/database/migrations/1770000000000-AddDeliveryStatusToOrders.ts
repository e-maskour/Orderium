import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDeliveryStatusToOrders1770000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryStatus',
        type: 'enum',
        enum: [
          'assigned',
          'confirmed',
          'picked_up',
          'to_delivery',
          'in_delivery',
          'delivered',
          'canceled',
        ],
        isNullable: true,
        default: null,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'deliveryStatus');
  }
}
