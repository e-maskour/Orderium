import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class RemoveIsConvertedFromOrders1769451473000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop isConverted column from orders table
    // convertedToInvoiceId already serves this purpose
    await queryRunner.dropColumn('orders', 'isConverted');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restore isConverted column
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'isConverted',
        type: 'boolean',
        default: false,
      }),
    );
  }
}
