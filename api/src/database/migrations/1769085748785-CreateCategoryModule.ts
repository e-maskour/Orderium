import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCategoryModule1769085748785 implements MigrationInterface {
    name = 'CreateCategoryModule1769085748785'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_76c3a13509109c5f1681217a129"`);
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_218766a99fd41fcf4424056ab4f"`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "code" character varying(100) NOT NULL, "description" text, "type" character varying(50) NOT NULL DEFAULT 'product', "isActive" boolean NOT NULL DEFAULT true, "parentId" integer, "dateCreated" TIMESTAMP NOT NULL DEFAULT now(), "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_77d7eff8a7aaa05457a12b8007a" UNIQUE ("code"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dc591a3520526561b639a2432e" ON "categories" ("type") `);
        await queryRunner.query(`CREATE INDEX "IDX_77d7eff8a7aaa05457a12b8007" ON "categories" ("code") `);
        await queryRunner.query(`CREATE INDEX "IDX_8b0be371d28245da6e4f4b6187" ON "categories" ("name") `);
        await queryRunner.query(`CREATE TABLE "product_categories" ("productId" integer NOT NULL, "categoryId" integer NOT NULL, CONSTRAINT "PK_e65c1adebf00d61f1c84a4f3950" PRIMARY KEY ("productId", "categoryId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6156a79599e274ee9d83b1de13" ON "product_categories" ("productId") `);
        await queryRunner.query(`CREATE INDEX "IDX_fdef3adba0c284fd103d0fd369" ON "product_categories" ("categoryId") `);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ALTER COLUMN "orderId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_218766a99fd41fcf4424056ab4f" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_76c3a13509109c5f1681217a129" FOREIGN KEY ("deliveryId") REFERENCES "delivery_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_6156a79599e274ee9d83b1de139" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "product_categories" ADD CONSTRAINT "FK_fdef3adba0c284fd103d0fd3697" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_fdef3adba0c284fd103d0fd3697"`);
        await queryRunner.query(`ALTER TABLE "product_categories" DROP CONSTRAINT "FK_6156a79599e274ee9d83b1de139"`);
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_76c3a13509109c5f1681217a129"`);
        await queryRunner.query(`ALTER TABLE "portal" DROP CONSTRAINT "FK_218766a99fd41fcf4424056ab4f"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" DROP CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_9a6f051e66982b5f0318981bcaa"`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ALTER COLUMN "orderId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "orders_delivery" ADD CONSTRAINT "FK_f01dffdb2fd3c0f7e28b309bb39" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fdef3adba0c284fd103d0fd369"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6156a79599e274ee9d83b1de13"`);
        await queryRunner.query(`DROP TABLE "product_categories"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8b0be371d28245da6e4f4b6187"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_77d7eff8a7aaa05457a12b8007"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc591a3520526561b639a2432e"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_218766a99fd41fcf4424056ab4f" FOREIGN KEY ("customerId") REFERENCES "partners"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "portal" ADD CONSTRAINT "FK_76c3a13509109c5f1681217a129" FOREIGN KEY ("deliveryId") REFERENCES "delivery_persons"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
