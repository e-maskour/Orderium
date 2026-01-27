import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuoteSignatureFields1769463224000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add client notes column
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN "clientNotes" text NULL;
    `);

    // Add signedBy column
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN "signedBy" varchar(255) NULL;
    `);

    // Add signedDate column
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN "signedDate" timestamp NULL;
    `);

    // Add shareToken column with unique constraint
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN "shareToken" varchar(100) NULL UNIQUE;
    `);

    // Add shareTokenExpiry column
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      ADD COLUMN "shareTokenExpiry" timestamp NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all added columns
    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN "shareTokenExpiry";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN "shareToken";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN "signedDate";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN "signedBy";
    `);

    await queryRunner.query(`
      ALTER TABLE "quotes" 
      DROP COLUMN "clientNotes";
    `);
  }
}
