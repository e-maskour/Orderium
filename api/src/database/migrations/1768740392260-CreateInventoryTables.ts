import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTables1768740392260 implements MigrationInterface {
  name = 'CreateInventoryTables1768740392260';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."locations_type_enum" AS ENUM('internal', 'view', 'supplier', 'customer', 'inventory', 'production', 'transit', 'scrap')`,
    );
    await queryRunner.query(
      `CREATE TABLE "locations" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "completePathName" character varying(500), "type" "public"."locations_type_enum" NOT NULL DEFAULT 'internal', "warehouseId" integer, "parentLocationId" integer, "notes" text, "isActive" boolean NOT NULL DEFAULT true, "isScrapLocation" boolean NOT NULL DEFAULT false, "isReturnLocation" boolean NOT NULL DEFAULT false, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2627bb0624a973aa66aefa101e" ON "locations" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e6e9f392f3a3cfafb95da5c7a4" ON "locations" ("completePathName") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_227023051ab1fedef7a3b6c7e2" ON "locations" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "warehouses" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(50) NOT NULL, "address" text, "city" character varying(100), "latitude" numeric(10,7), "longitude" numeric(10,7), "phoneNumber" character varying(50), "managerName" character varying(255), "isActive" boolean NOT NULL DEFAULT true, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_d8b96d60ff9a288f5ed862280d9" UNIQUE ("code"), CONSTRAINT "PK_56ae21ee2432b2270b48867e4be" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8b96d60ff9a288f5ed862280d" ON "warehouses" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_be9dd3cc2931f11f7440f2eeb1" ON "warehouses" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "unit_of_measures" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(50) NOT NULL, "category" character varying(100) NOT NULL, "ratio" numeric(18,6) NOT NULL DEFAULT '1', "roundingPrecision" character varying(10), "isBaseUnit" boolean NOT NULL DEFAULT false, "baseUnitId" integer, "isActive" boolean NOT NULL DEFAULT true, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b7582f97801147940892a96e08" UNIQUE ("code"), CONSTRAINT "PK_e875eebb54ac0b74160345926d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba507c058dae49c0bb3c0277dd" ON "unit_of_measures" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1ad0970ca0247cec3c63a2c0dd" ON "unit_of_measures" ("name") `,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_quants" ("id" SERIAL NOT NULL, "productId" integer NOT NULL, "locationId" integer NOT NULL, "quantity" numeric(18,4) NOT NULL DEFAULT '0', "reservedQuantity" numeric(18,4) NOT NULL DEFAULT '0', "availableQuantity" numeric(18,4) NOT NULL DEFAULT '0', "incomingQuantity" numeric(18,4) NOT NULL DEFAULT '0', "outgoingQuantity" numeric(18,4) NOT NULL DEFAULT '0', "unitOfMeasureId" integer, "lotNumber" character varying(100), "serialNumber" character varying(100), "expirationDate" TIMESTAMP, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_94704f90ccf1389173d3f56cbd7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_834e767f11145fc34e331b2aa8" ON "stock_quants" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c4c38d0ad3c9d7202bc4518cd" ON "stock_quants" ("productId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_73e0846c45676f5c6ea8b1520f" ON "stock_quants" ("productId", "locationId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_movementtype_enum" AS ENUM('receipt', 'delivery', 'internal', 'adjustment', 'production_in', 'production_out', 'return_in', 'return_out', 'scrap')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."stock_movements_status_enum" AS ENUM('draft', 'waiting', 'confirmed', 'assigned', 'done', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "stock_movements" ("id" SERIAL NOT NULL, "reference" character varying(50) NOT NULL, "movementType" "public"."stock_movements_movementtype_enum" NOT NULL DEFAULT 'internal', "productId" integer NOT NULL, "sourceLocationId" integer, "destLocationId" integer, "quantity" numeric(18,4) NOT NULL, "unitOfMeasureId" integer, "status" "public"."stock_movements_status_enum" NOT NULL DEFAULT 'draft', "dateScheduled" TIMESTAMP, "dateDone" TIMESTAMP, "origin" character varying(255), "lotNumber" character varying(100), "serialNumber" character varying(100), "notes" text, "createdByUserId" integer, "validatedByUserId" integer, "partnerName" character varying(255), "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_06f0c5a720f8750702edb44bf44" UNIQUE ("reference"), CONSTRAINT "PK_57a26b190618550d8e65fb860e7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a2bdf34bccb563df914210ce4" ON "stock_movements" ("dateScheduled") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_06f0c5a720f8750702edb44bf4" ON "stock_movements" ("reference") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_591aca148f00fd61c720c81424" ON "stock_movements" ("movementType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b9d62e3e30aa32d6d273509f81" ON "stock_movements" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08df345702c01f74765486e872" ON "stock_movements" ("destLocationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba206a0726ffed1be484bd1e0b" ON "stock_movements" ("sourceLocationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a3acb59db67e977be45e382fc5" ON "stock_movements" ("productId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_adjustments_status_enum" AS ENUM('draft', 'in_progress', 'done', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_adjustments" ("id" SERIAL NOT NULL, "reference" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "locationId" integer NOT NULL, "status" "public"."inventory_adjustments_status_enum" NOT NULL DEFAULT 'draft', "adjustmentDate" TIMESTAMP, "userId" integer, "notes" text, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_7e8748300907c68b4ac40b7cb1e" UNIQUE ("reference"), CONSTRAINT "PK_67a6cd67ec23f212ac3d124325e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b620366bf5523108d3d671f331" ON "inventory_adjustments" ("adjustmentDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c4bcb30ab95fcffdcf4a765be" ON "inventory_adjustments" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_71e80e761321396ba9b29e4b7a" ON "inventory_adjustments" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e8748300907c68b4ac40b7cb1" ON "inventory_adjustments" ("reference") `,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_adjustment_lines" ("id" SERIAL NOT NULL, "adjustmentId" integer NOT NULL, "productId" integer NOT NULL, "theoreticalQuantity" numeric(18,4) NOT NULL DEFAULT '0', "countedQuantity" numeric(18,4) NOT NULL DEFAULT '0', "difference" numeric(18,4) NOT NULL DEFAULT '0', "lotNumber" character varying(100), "serialNumber" character varying(100), "notes" text, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_54af94f1cd00c4bf959124da23a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f4c13c8ed92ce8d081836b0170" ON "inventory_adjustment_lines" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e0019551838f1b1543a82f8a0" ON "inventory_adjustment_lines" ("adjustmentId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_3e4f83b9faa7491b9f86294f53e" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ADD CONSTRAINT "FK_55f92f2bd926e8da769c09a6fe5" FOREIGN KEY ("parentLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "unit_of_measures" ADD CONSTRAINT "FK_8c45c449f76da9948ded7159dab" FOREIGN KEY ("baseUnitId") REFERENCES "unit_of_measures"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" ADD CONSTRAINT "FK_9c4c38d0ad3c9d7202bc4518cdd" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" ADD CONSTRAINT "FK_834e767f11145fc34e331b2aa81" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" ADD CONSTRAINT "FK_cfe8c3d83e99b44e98be82c2087" FOREIGN KEY ("unitOfMeasureId") REFERENCES "unit_of_measures"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_a3acb59db67e977be45e382fc56" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_ba206a0726ffed1be484bd1e0bb" FOREIGN KEY ("sourceLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_08df345702c01f74765486e8726" FOREIGN KEY ("destLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_42a32f383bdd9f4db9b6b6134c9" FOREIGN KEY ("unitOfMeasureId") REFERENCES "unit_of_measures"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "FK_71e80e761321396ba9b29e4b7a4" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_adjustment_lines" ADD CONSTRAINT "FK_2e0019551838f1b1543a82f8a0f" FOREIGN KEY ("adjustmentId") REFERENCES "inventory_adjustments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_adjustment_lines" DROP CONSTRAINT "FK_2e0019551838f1b1543a82f8a0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_adjustments" DROP CONSTRAINT "FK_71e80e761321396ba9b29e4b7a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_42a32f383bdd9f4db9b6b6134c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_08df345702c01f74765486e8726"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_ba206a0726ffed1be484bd1e0bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_a3acb59db67e977be45e382fc56"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" DROP CONSTRAINT "FK_cfe8c3d83e99b44e98be82c2087"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" DROP CONSTRAINT "FK_834e767f11145fc34e331b2aa81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "stock_quants" DROP CONSTRAINT "FK_9c4c38d0ad3c9d7202bc4518cdd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "unit_of_measures" DROP CONSTRAINT "FK_8c45c449f76da9948ded7159dab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_55f92f2bd926e8da769c09a6fe5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT "FK_3e4f83b9faa7491b9f86294f53e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e0019551838f1b1543a82f8a0"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f4c13c8ed92ce8d081836b0170"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_adjustment_lines"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e8748300907c68b4ac40b7cb1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_71e80e761321396ba9b29e4b7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c4bcb30ab95fcffdcf4a765be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b620366bf5523108d3d671f331"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_adjustments"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_adjustments_status_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a3acb59db67e977be45e382fc5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba206a0726ffed1be484bd1e0b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08df345702c01f74765486e872"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b9d62e3e30aa32d6d273509f81"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_591aca148f00fd61c720c81424"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_06f0c5a720f8750702edb44bf4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a2bdf34bccb563df914210ce4"`,
    );
    await queryRunner.query(`DROP TABLE "stock_movements"`);
    await queryRunner.query(`DROP TYPE "public"."stock_movements_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."stock_movements_movementtype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_73e0846c45676f5c6ea8b1520f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c4c38d0ad3c9d7202bc4518cd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_834e767f11145fc34e331b2aa8"`,
    );
    await queryRunner.query(`DROP TABLE "stock_quants"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1ad0970ca0247cec3c63a2c0dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba507c058dae49c0bb3c0277dd"`,
    );
    await queryRunner.query(`DROP TABLE "unit_of_measures"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_be9dd3cc2931f11f7440f2eeb1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8b96d60ff9a288f5ed862280d"`,
    );
    await queryRunner.query(`DROP TABLE "warehouses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_227023051ab1fedef7a3b6c7e2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e6e9f392f3a3cfafb95da5c7a4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2627bb0624a973aa66aefa101e"`,
    );
    await queryRunner.query(`DROP TABLE "locations"`);
    await queryRunner.query(`DROP TYPE "public"."locations_type_enum"`);
  }
}
