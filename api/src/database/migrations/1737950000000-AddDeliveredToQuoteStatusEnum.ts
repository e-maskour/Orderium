import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliveredToQuoteStatusEnum1737950000000 implements MigrationInterface {
    name = 'AddDeliveredToQuoteStatusEnum1737950000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Skip if quotes table doesn't exist yet (it will be created later with the correct enum)
        const tableExists = await queryRunner.hasTable('quotes');
        if (!tableExists) return;

        // Step 1: Create a temporary column with VARCHAR type
        await queryRunner.query(`
            ALTER TABLE "quotes" ADD COLUMN "status_temp" VARCHAR(20);
        `);

        // Step 2: Copy existing data to temp column
        await queryRunner.query(`
            UPDATE "quotes" SET "status_temp" = "status"::text;
        `);

        // Step 3: Drop the old status column and enum type
        await queryRunner.query(`
            ALTER TABLE "quotes" DROP COLUMN "status";
        `);

        await queryRunner.query(`
            DROP TYPE "quotes_status_enum";
        `);

        // Step 4: Create the new enum type with 'delivered' added
        await queryRunner.query(`
            CREATE TYPE "quotes_status_enum" AS ENUM ('draft', 'open', 'signed', 'closed', 'delivered', 'invoiced');
        `);

        // Step 5: Add the new status column with the new enum type
        await queryRunner.query(`
            ALTER TABLE "quotes" ADD COLUMN "status" "quotes_status_enum" DEFAULT 'draft' NOT NULL;
        `);

        // Step 6: Copy data from temp column to new status column
        await queryRunner.query(`
            UPDATE "quotes" SET "status" = "status_temp"::"quotes_status_enum";
        `);

        // Step 7: Drop the temporary column
        await queryRunner.query(`
            ALTER TABLE "quotes" DROP COLUMN "status_temp";
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('quotes');
        if (!tableExists) return;

        // Reverse migration - remove 'delivered' from enum
        await queryRunner.query(`
            -- Create a temporary column
            ALTER TABLE "quotes" ADD COLUMN "status_temp" VARCHAR(20);
            
            -- Copy current values and handle 'delivered' status
            UPDATE "quotes" SET "status_temp" = 
                CASE 
                    WHEN "status"::text = 'delivered' THEN 'invoiced'
                    ELSE "status"::text
                END;
            
            -- Drop the column
            ALTER TABLE "quotes" DROP COLUMN "status";
            
            -- Drop the current enum type
            DROP TYPE "quotes_status_enum";
            
            -- Recreate the enum type without 'delivered'
            CREATE TYPE "quotes_status_enum" AS ENUM ('draft', 'open', 'signed', 'closed', 'invoiced');
            
            -- Add the column back
            ALTER TABLE "quotes" ADD COLUMN "status" "quotes_status_enum" DEFAULT 'draft' NOT NULL;
            
            -- Migrate data back
            UPDATE "quotes" SET "status" = "status_temp"::"quotes_status_enum";
            
            -- Drop temporary column
            ALTER TABLE "quotes" DROP COLUMN "status_temp";
        `);
    }
}
