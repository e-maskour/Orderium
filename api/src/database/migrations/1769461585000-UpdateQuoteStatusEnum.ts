import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateQuoteStatusEnum1769461585000 implements MigrationInterface {
  name = 'UpdateQuoteStatusEnum1769461585000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL requires enum modifications to be done outside of transactions
    // So we'll use a different approach: recreate the enum type completely

    // Step 1: Create a temporary column with VARCHAR type
    await queryRunner.query(`
            ALTER TABLE "quotes" ADD COLUMN "status_temp" VARCHAR(20);
        `);

    // Step 2: Copy and migrate existing data to temp column
    await queryRunner.query(`
            UPDATE "quotes" SET "status_temp" = 
                CASE 
                    WHEN "status"::text = 'draft' THEN 'draft'
                    WHEN "status"::text = 'sent' THEN 'open'
                    WHEN "status"::text = 'accepted' THEN 'signed'
                    WHEN "status"::text IN ('rejected', 'expired') THEN 'closed'
                    WHEN "status"::text = 'converted' THEN 'invoiced'
                    ELSE 'draft'
                END;
        `);

    // Step 3: Drop the old status column and enum type
    await queryRunner.query(`
            ALTER TABLE "quotes" DROP COLUMN "status";
        `);

    await queryRunner.query(`
            DROP TYPE "quotes_status_enum";
        `);

    // Step 4: Create the new enum type
    await queryRunner.query(`
            CREATE TYPE "quotes_status_enum" AS ENUM ('draft', 'open', 'signed', 'closed', 'invoiced');
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
    // Reverse migration - restore old enum values
    await queryRunner.query(`
            -- Create a temporary column
            ALTER TABLE "quotes" ADD COLUMN "status_new" VARCHAR(20);
            
            -- Copy current values
            UPDATE "quotes" SET "status_new" = "status"::text;
            
            -- Drop the column
            ALTER TABLE "quotes" DROP COLUMN "status";
            
            -- Drop the new enum type
            DROP TYPE "quotes_status_enum";
            
            -- Recreate the old enum type
            CREATE TYPE "quotes_status_enum" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted');
            
            -- Add the column back
            ALTER TABLE "quotes" ADD COLUMN "status" "quotes_status_enum" DEFAULT 'draft';
            
            -- Migrate data back
            UPDATE "quotes" SET "status" = 'sent'::"quotes_status_enum" WHERE "status_new" = 'open';
            UPDATE "quotes" SET "status" = 'accepted'::"quotes_status_enum" WHERE "status_new" = 'signed';
            UPDATE "quotes" SET "status" = 'rejected'::"quotes_status_enum" WHERE "status_new" = 'closed';
            UPDATE "quotes" SET "status" = 'converted'::"quotes_status_enum" WHERE "status_new" = 'invoiced';
            UPDATE "quotes" SET "status" = 'draft'::"quotes_status_enum" WHERE "status_new" = 'draft';
            
            -- Drop temporary column
            ALTER TABLE "quotes" DROP COLUMN "status_new";
            
            -- Set NOT NULL constraint
            ALTER TABLE "quotes" ALTER COLUMN "status" SET NOT NULL;
        `);
  }
}
