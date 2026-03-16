import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorEntitiesWithBaseClasses1769472665710 implements MigrationInterface {
  name = 'RefactorEntitiesWithBaseClasses1769472665710';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_saleUnitId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_products_purchaseUnitId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_ccf1feb9e280240bb05dc0aed2a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf8e0f9dd4558ef209ec111782"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_orders_orderNumber"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTES_NUMBER"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTES_CUSTOMER"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTES_DATE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTES_EXPIRATION_DATE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTE_ITEMS_QUOTE"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_QUOTE_ITEMS_PRODUCT"`);
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "invoiceNumber" TO "documentNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" RENAME COLUMN "quoteNumber" TO "documentNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" RENAME CONSTRAINT "UQ_a3cfb26a07c0ac65bd019e9bc50" TO "UQ_ed719dddc8817c7088b921d0223"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_orders_orderNumber"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "orderNumber"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "documentTypeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "referenceDocumentNumber"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "note"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paidStatus"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "discountApplyRule"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "serviceType"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "priceBeforeTax"`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "price"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "productCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "priceAfterDiscount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "priceBeforeTaxAfterDiscount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "totalAfterDocumentDiscount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "discountApplyRule"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "documentNumber" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_3e0f93349c0797c99b9a5789855" UNIQUE ("documentNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "customerName" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "customerPhone" character varying(50)`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "customerAddress" text`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "subtotal" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "tax" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "isValidated" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "notes" text`);
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "description" character varying(255) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "unitPrice" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "tax" numeric(5,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum" RENAME TO "order_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."orders_status_enum" AS ENUM('draft', 'validated', 'in_progress', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."orders_status_enum" USING "status"::"text"::"public"."orders_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."order_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ALTER COLUMN "dateCreated" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ALTER COLUMN "dateUpdated" SET DEFAULT now()`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0c95a02856a1acb54a4168be9b" ON "invoices" ("documentNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3e0f93349c0797c99b9a578985" ON "orders" ("documentNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_93a085c3005dcd0d949a40b909" ON "quotes" ("expirationDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5576bb64e37d0c192294627687" ON "quotes" ("date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ccf1feb9e280240bb05dc0aed2" ON "quotes" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed719dddc8817c7088b921d022" ON "quotes" ("documentNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ac5c52bd99a4569e49db986b82" ON "quote_items" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ef162674660b3ed9dc76de2116" ON "quote_items" ("quoteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_93f14f453d597e4e015f3b5ad0a" FOREIGN KEY ("saleUnitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_9ac2ab69b92853c1c7a988aa79c" FOREIGN KEY ("purchaseUnitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_43d19956aeab008b49e0804c145" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_ccf1feb9e280240bb05dc0aed2a" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quotes" DROP CONSTRAINT "FK_ccf1feb9e280240bb05dc0aed2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_9ac2ab69b92853c1c7a988aa79c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_93f14f453d597e4e015f3b5ad0a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ef162674660b3ed9dc76de2116"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ac5c52bd99a4569e49db986b82"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed719dddc8817c7088b921d022"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ccf1feb9e280240bb05dc0aed2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5576bb64e37d0c192294627687"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_93a085c3005dcd0d949a40b909"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3e0f93349c0797c99b9a578985"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0c95a02856a1acb54a4168be9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ALTER COLUMN "dateUpdated" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ALTER COLUMN "dateCreated" SET DEFAULT CURRENT_TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."order_status_enum_old" AS ENUM('draft', 'validated', 'in_progress', 'delivered', 'cancelled')`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" TYPE "public"."order_status_enum_old" USING "status"::"text"::"public"."order_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'draft'`,
    );
    await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."order_status_enum_old" RENAME TO "order_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "tax"`);
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "unitPrice"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" DROP COLUMN "description"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "notes"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "isValidated"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "tax"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "subtotal"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "customerAddress"`,
    );
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerPhone"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "customerName"`);
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT "UQ_3e0f93349c0797c99b9a5789855"`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "documentNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "discountApplyRule" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "totalAfterDocumentDiscount" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "priceBeforeTaxAfterDiscount" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "priceAfterDiscount" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "productCost" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "price" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_items" ADD "priceBeforeTax" numeric(18,2) NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "serviceType" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "discountApplyRule" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "paidStatus" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(`ALTER TABLE "orders" ADD "note" text`);
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "referenceDocumentNumber" character varying(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "documentTypeId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD "orderNumber" character varying(50) NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber")`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" RENAME CONSTRAINT "UQ_ed719dddc8817c7088b921d0223" TO "UQ_a3cfb26a07c0ac65bd019e9bc50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" RENAME COLUMN "documentNumber" TO "quoteNumber"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" RENAME COLUMN "documentNumber" TO "invoiceNumber"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTE_ITEMS_PRODUCT" ON "quote_items" ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTE_ITEMS_QUOTE" ON "quote_items" ("quoteId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTES_EXPIRATION_DATE" ON "quotes" ("expirationDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTES_DATE" ON "quotes" ("date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTES_CUSTOMER" ON "quotes" ("customerId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_QUOTES_NUMBER" ON "quotes" ("quoteNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_orderNumber" ON "orders" ("orderNumber") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf8e0f9dd4558ef209ec111782" ON "invoices" ("invoiceNumber") `,
    );
    await queryRunner.query(
      `ALTER TABLE "quotes" ADD CONSTRAINT "FK_ccf1feb9e280240bb05dc0aed2a" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_purchaseUnitId" FOREIGN KEY ("purchaseUnitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_products_saleUnitId" FOREIGN KEY ("saleUnitId") REFERENCES "unit_of_measures"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
