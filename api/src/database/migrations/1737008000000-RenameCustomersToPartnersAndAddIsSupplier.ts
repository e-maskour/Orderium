import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameCustomersToPartnersAndAddIsSupplier1737008000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename the customers table to partners
    await queryRunner.query(`ALTER TABLE "customers" RENAME TO "partners"`);

    // Add isSupplier column to partners table
    await queryRunner.query(
      `ALTER TABLE "partners" ADD COLUMN "isSupplier" boolean NOT NULL DEFAULT false`,
    );

    // Add isCustomer column if it doesn't exist (it should already exist)
    const table = await queryRunner.getTable('partners');
    const hasIsCustomer = table?.columns.find(
      (column) => column.name === 'isCustomer',
    );
    if (!hasIsCustomer) {
      await queryRunner.query(
        `ALTER TABLE "partners" ADD COLUMN "isCustomer" boolean NOT NULL DEFAULT true`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove isSupplier column
    await queryRunner.query(`ALTER TABLE "partners" DROP COLUMN "isSupplier"`);

    // Rename partners table back to customers
    await queryRunner.query(`ALTER TABLE "partners" RENAME TO "customers"`);
  }
}
