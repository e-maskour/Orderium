import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfirmedPickedUpToOrderStatus1774570200000
  implements MigrationInterface
{
  name = 'AddConfirmedPickedUpToOrderStatus1774570200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL ALTER TYPE ADD VALUE cannot run inside a transaction block.
    // TypeORM migrations run in a transaction by default, so we must use
    // COMMIT / BEGIN to temporarily step outside the transaction.
    await queryRunner.query(`COMMIT`);
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'confirmed'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_status_enum" ADD VALUE IF NOT EXISTS 'picked_up'`,
    );
    await queryRunner.query(`BEGIN`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values once added.
    // A full enum recreation would be needed; leaving as no-op intentionally.
  }
}
