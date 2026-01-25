import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUomStringColumnsFromProducts1769214363471 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove saleUnit and purchaseUnit string columns since we now use IDs
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "saleUnit"`);
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN IF EXISTS "purchaseUnit"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Restore columns if needed to rollback
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "saleUnit" varchar(50) DEFAULT 'Unité(s)'
        `);
        
        await queryRunner.query(`
            ALTER TABLE "products"
            ADD COLUMN "purchaseUnit" varchar(50) DEFAULT 'Unité(s)'
        `);
        
        // Restore data from UOM relations
        await queryRunner.query(`
            UPDATE products p
            SET "saleUnit" = uom.name
            FROM unit_of_measures uom
            WHERE p."saleUnitId" = uom.id
        `);
        
        await queryRunner.query(`
            UPDATE products p
            SET "purchaseUnit" = uom.name
            FROM unit_of_measures uom
            WHERE p."purchaseUnitId" = uom.id
        `);
    }

}
