#!/usr/bin/env ts-node
/**
 * migrate-all-tenants.ts
 * ──────────────────────
 * Runs pending TypeORM migrations against every active tenant database
 * (or a single tenant when --tenant=<slug> is specified).
 *
 * Usage:
 *   # All tenants
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-all-tenants.ts
 *
 *   # Specific tenant
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-all-tenants.ts --tenant=acme
 *
 * Add to package.json scripts:
 *   "migration:run:master":  "typeorm-ts-node-commonjs migration:run -d src/database/master-data-source.ts",
 *   "migration:run:all":     "ts-node -r tsconfig-paths/register src/scripts/migrate-all-tenants.ts",
 *   "migration:run:tenant":  "ts-node -r tsconfig-paths/register src/scripts/migrate-all-tenants.ts --tenant="
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';
import { MasterDataSource } from '../database/master-data-source';
import { Tenant } from '../modules/tenant/tenant.entity';

config({ path: path.resolve(__dirname, '../../.env.local') });
config({ path: path.resolve(__dirname, '../../.env') });

// ─── CLI argument parsing ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const tenantArg = args.find((a) => a.startsWith('--tenant='));
const targetSlug = tenantArg ? tenantArg.split('=')[1].trim() : null;

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Connecting to master database …');
  await MasterDataSource.initialize();

  const tenantRepo = MasterDataSource.getRepository(Tenant);
  const tenants = targetSlug
    ? await tenantRepo.find({ where: { slug: targetSlug, isActive: true } })
    : await tenantRepo.find({ where: { isActive: true } });

  if (tenants.length === 0) {
    const label = targetSlug ? `tenant '${targetSlug}'` : 'active tenants';
    console.error(`No ${label} found.`);
    process.exit(1);
  }

  console.log(
    `Running migrations for ${tenants.length} tenant(s): ${tenants.map((t) => t.slug).join(', ')}\n`,
  );

  const results: { slug: string; status: 'ok' | 'failed'; error?: string }[] =
    [];

  for (const tenant of tenants) {
    const ds = buildTenantDataSource(tenant);
    try {
      await ds.initialize();
      const pending = await ds.showMigrations();
      if (!pending) {
        console.log(`  [${tenant.slug}] ✓ Already up-to-date`);
        results.push({ slug: tenant.slug, status: 'ok' });
        continue;
      }

      const migrations = await ds.runMigrations({ transaction: 'each' });
      console.log(
        `  [${tenant.slug}] ✓ Applied ${migrations.length} migration(s): ${migrations.map((m) => m.name).join(', ')}`,
      );
      results.push({ slug: tenant.slug, status: 'ok' });
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error(`  [${tenant.slug}] ✗ FAILED: ${message}`);
      results.push({ slug: tenant.slug, status: 'failed', error: message });
    } finally {
      if (ds.isInitialized) await ds.destroy();
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const failed = results.filter((r) => r.status === 'failed');
  console.log(
    `\nDone. ${results.length - failed.length} succeeded, ${failed.length} failed.`,
  );

  await MasterDataSource.destroy();

  if (failed.length > 0) process.exit(1);
}

function buildTenantDataSource(tenant: Tenant): DataSource {
  return new DataSource({
    type: 'postgres',
    host: tenant.databaseHost || process.env.DB_HOST || 'localhost',
    port: tenant.databasePort || parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: tenant.databaseName,
    // Load all business entity classes (NOT Tenant — it lives in master)
    entities: [path.resolve(__dirname, '../modules/**/*.entity{.ts,.js}')],
    migrations: [path.resolve(__dirname, '../database/migrations/*{.ts,.js}')],
    synchronize: false,
    logging: false,
  });
}

main().catch((err: unknown) => {
  console.error('Fatal error:', (err as Error).message);
  process.exit(1);
});
