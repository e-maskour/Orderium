import { MigrationInterface, QueryRunner } from 'typeorm';

/** Landing-page leads, followed up from the tenant dashboard. */
export class CreateLeads1789200000000 implements MigrationInterface {
  name = 'CreateLeads1789200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "leads" (
        "id"           SERIAL PRIMARY KEY,
        "name"         varchar(120) NOT NULL,
        "company"      varchar(160),
        "phone"        varchar(40)  NOT NULL,
        "email"        varchar(255),
        "activity"     varchar(80),
        "message"      text,
        "locale"       varchar(8)   NOT NULL DEFAULT 'fr',
        "channel"      varchar(16)  NOT NULL DEFAULT 'whatsapp',
        "status"       varchar(16)  NOT NULL DEFAULT 'new',
        "notes"        text,
        "utmSource"    varchar(120),
        "utmMedium"    varchar(120),
        "utmCampaign"  varchar(160),
        "utmTerm"      varchar(160),
        "utmContent"   varchar(160),
        "referrer"     varchar(500),
        "landingPath"  varchar(300),
        "ipHash"       varchar(64),
        "userAgent"    varchar(300),
        "contactedAt"  timestamptz,
        "createdAt"    timestamptz  NOT NULL DEFAULT now(),
        "updatedAt"    timestamptz  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leads_status_createdAt" ON "leads" ("status", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_leads_phone" ON "leads" ("phone")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "leads"`);
  }
}
