import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderStatusEnum1769461799000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the new enum type
    await queryRunner.query(`
      CREATE TYPE "order_status_enum" AS ENUM('draft', 'validated', 'in_progress', 'delivered', 'cancelled');
    `);

    // Add the status column with default value (all existing orders start as 'draft')
    await queryRunner.query(`
      ALTER TABLE "orders" 
      ADD COLUMN "status" "order_status_enum" DEFAULT 'draft';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the status column
    await queryRunner.query(`
      ALTER TABLE "orders" 
      DROP COLUMN "status";
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE "order_status_enum";
    `);
  }
}
