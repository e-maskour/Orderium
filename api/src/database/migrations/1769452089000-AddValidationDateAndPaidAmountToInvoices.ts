import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddValidationDateAndPaidAmountToInvoices1769452089000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add validationDate column
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'validationDate',
        type: 'date',
        isNullable: true,
      }),
    );

    // Add paidAmount column
    await queryRunner.addColumn(
      'invoices',
      new TableColumn({
        name: 'paidAmount',
        type: 'decimal',
        precision: 18,
        scale: 2,
        default: 0,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('invoices', 'paidAmount');
    await queryRunner.dropColumn('invoices', 'validationDate');
  }
}
