import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Super-admin accounts for the tenant dashboard (email + password + 2FA,
 * then the platform API key). See PlatformAdmin entity.
 */
export class CreatePlatformAdmins1788000000000 implements MigrationInterface {
  name = 'CreatePlatformAdmins1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_admins" (
        "id"                     SERIAL PRIMARY KEY,
        "email"                  varchar(255) NOT NULL,
        "name"                   varchar(120),
        "passwordHash"           varchar(255) NOT NULL,
        "twoFactorMethod"        varchar(10),
        "pendingTwoFactorMethod" varchar(10),
        "totpSecretEnc"          text,
        "totpPendingSecretEnc"   text,
        "lastTotpStep"           integer,
        "emailOtpHash"           varchar(64),
        "emailOtpExpiresAt"      TIMESTAMPTZ,
        "emailOtpSentAt"         TIMESTAMPTZ,
        "otpAttempts"            integer      NOT NULL DEFAULT 0,
        "failedLoginCount"       integer      NOT NULL DEFAULT 0,
        "lockedUntil"            TIMESTAMPTZ,
        "tokenVersion"           integer      NOT NULL DEFAULT 0,
        "isActive"               boolean      NOT NULL DEFAULT true,
        "lastLoginAt"            TIMESTAMPTZ,
        "lastLoginIp"            varchar(64),
        "createdAt"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updatedAt"              TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_platform_admins_email" ON "platform_admins" ("email")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_admins"`);
  }
}
