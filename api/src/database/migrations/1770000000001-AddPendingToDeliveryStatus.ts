import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPendingToDeliveryStatus1770000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create new enum type with 'pending' added
    await queryRunner.query(
      `CREATE TYPE "public"."orders_deliverystatus_enum_new" AS ENUM('pending', 'assigned', 'confirmed', 'picked_up', 'to_delivery', 'in_delivery', 'delivered', 'canceled')`,
    );

    // Alter column to use new enum type
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "deliveryStatus" TYPE "public"."orders_deliverystatus_enum_new" USING "deliveryStatus"::text::"public"."orders_deliverystatus_enum_new"`,
    );

    // Drop old enum type
    await queryRunner.query(`DROP TYPE "public"."orders_deliverystatus_enum"`);

    // Rename new enum type to original name
    await queryRunner.query(
      `ALTER TYPE "public"."orders_deliverystatus_enum_new" RENAME TO "orders_deliverystatus_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Create new enum type without 'pending'
    await queryRunner.query(
      `CREATE TYPE "public"."orders_deliverystatus_enum_new" AS ENUM('assigned', 'confirmed', 'picked_up', 'to_delivery', 'in_delivery', 'delivered', 'canceled')`,
    );

    // Alter column to use new enum type
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "deliveryStatus" TYPE "public"."orders_deliverystatus_enum_new" USING "deliveryStatus"::text::"public"."orders_deliverystatus_enum_new"`,
    );

    // Drop old enum type
    await queryRunner.query(`DROP TYPE "public"."orders_deliverystatus_enum"`);

    // Rename new enum type to original name
    await queryRunner.query(
      `ALTER TYPE "public"."orders_deliverystatus_enum_new" RENAME TO "orders_deliverystatus_enum"`,
    );
  }
}
