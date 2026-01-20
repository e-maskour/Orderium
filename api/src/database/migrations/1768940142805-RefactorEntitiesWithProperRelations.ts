import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorEntitiesWithProperRelations1768940142805 implements MigrationInterface {
    name = 'RefactorEntitiesWithProperRelations1768940142805'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`);
        await queryRunner.query(`ALTER TABLE "stock_quants" DROP CONSTRAINT "FK_834e767f11145fc34e331b2aa81"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_ba206a0726ffed1be484bd1e0bb"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_08df345702c01f74765486e8726"`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" DROP CONSTRAINT "FK_71e80e761321396ba9b29e4b7a4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_834e767f11145fc34e331b2aa8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73e0846c45676f5c6ea8b1520f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_08df345702c01f74765486e872"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ba206a0726ffed1be484bd1e0b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_71e80e761321396ba9b29e4b7a"`);
        await queryRunner.query(`ALTER TABLE "stock_quants" RENAME COLUMN "locationId" TO "warehouseId"`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" RENAME COLUMN "locationId" TO "warehouseId"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "defaultTax"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "sourceLocationId"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "destLocationId"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD "sourceWarehouseId" integer`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD "destWarehouseId" integer`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "invoiceId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "productId" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_76a939951fd52f5ecc7e9daea4" ON "stock_quants" ("warehouseId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6aadde98a9d5f26184ea03e528" ON "stock_quants" ("productId", "warehouseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d8c5ce4f5977802011b587b3a" ON "stock_movements" ("destWarehouseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fcbe59d62b9ebe9a507c41f47b" ON "stock_movements" ("sourceWarehouseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_098288896b743608e8eb590ba8" ON "inventory_adjustments" ("warehouseId") `);
        await queryRunner.query(`ALTER TABLE "products" ADD CONSTRAINT "FK_2e593d5836b65fc8f8056b364fe" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_7bec360ed9928668b73dac2ec17" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_824be6feda5e655c49c4e0c534b" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_c93c5c654f9862a026c5249ac6a" FOREIGN KEY ("supplierId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_9ab53e1393993bbf541adc3c2e5" FOREIGN KEY ("adminId") REFERENCES "portal"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_bf4bfca1c9c88a380e673cf4c00" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_692a909ee0fa9383e7859f9b406" FOREIGN KEY ("userId") REFERENCES "portal"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_quants" ADD CONSTRAINT "FK_76a939951fd52f5ecc7e9daea47" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_fcbe59d62b9ebe9a507c41f47bd" FOREIGN KEY ("sourceWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_5d8c5ce4f5977802011b587b3ae" FOREIGN KEY ("destWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "FK_098288896b743608e8eb590ba88" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustment_lines" ADD CONSTRAINT "FK_f4c13c8ed92ce8d081836b0170a" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inventory_adjustment_lines" DROP CONSTRAINT "FK_f4c13c8ed92ce8d081836b0170a"`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" DROP CONSTRAINT "FK_098288896b743608e8eb590ba88"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_5d8c5ce4f5977802011b587b3ae"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP CONSTRAINT "FK_fcbe59d62b9ebe9a507c41f47bd"`);
        await queryRunner.query(`ALTER TABLE "stock_quants" DROP CONSTRAINT "FK_76a939951fd52f5ecc7e9daea47"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_692a909ee0fa9383e7859f9b406"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_cdb99c05982d5191ac8465ac010"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_bf4bfca1c9c88a380e673cf4c00"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_9ab53e1393993bbf541adc3c2e5"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_c93c5c654f9862a026c5249ac6a"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_824be6feda5e655c49c4e0c534b"`);
        await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`);
        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_7bec360ed9928668b73dac2ec17"`);
        await queryRunner.query(`ALTER TABLE "invoice_items" DROP CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59"`);
        await queryRunner.query(`ALTER TABLE "products" DROP CONSTRAINT "FK_2e593d5836b65fc8f8056b364fe"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_098288896b743608e8eb590ba8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fcbe59d62b9ebe9a507c41f47b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5d8c5ce4f5977802011b587b3a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6aadde98a9d5f26184ea03e528"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_76a939951fd52f5ecc7e9daea4"`);
        await queryRunner.query(`ALTER TABLE "order_items" ALTER COLUMN "productId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN "invoiceId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "destWarehouseId"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" DROP COLUMN "sourceWarehouseId"`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD "destLocationId" integer`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD "sourceLocationId" integer`);
        await queryRunner.query(`ALTER TABLE "products" ADD "defaultTax" numeric(5,2) NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" RENAME COLUMN "warehouseId" TO "locationId"`);
        await queryRunner.query(`ALTER TABLE "stock_quants" RENAME COLUMN "warehouseId" TO "locationId"`);
        await queryRunner.query(`CREATE INDEX "IDX_71e80e761321396ba9b29e4b7a" ON "inventory_adjustments" ("locationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_ba206a0726ffed1be484bd1e0b" ON "stock_movements" ("sourceLocationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_08df345702c01f74765486e872" ON "stock_movements" ("destLocationId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_73e0846c45676f5c6ea8b1520f" ON "stock_quants" ("locationId", "productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_834e767f11145fc34e331b2aa8" ON "stock_quants" ("locationId") `);
        await queryRunner.query(`ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "FK_71e80e761321396ba9b29e4b7a4" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_08df345702c01f74765486e8726" FOREIGN KEY ("destLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_movements" ADD CONSTRAINT "FK_ba206a0726ffed1be484bd1e0bb" FOREIGN KEY ("sourceLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "stock_quants" ADD CONSTRAINT "FK_834e767f11145fc34e331b2aa81" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_cdb99c05982d5191ac8465ac010" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice_items" ADD CONSTRAINT "FK_7fb6895fc8fad9f5200e91abb59" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
