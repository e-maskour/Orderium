import {
  buildPermissionCatalogue,
  ALL_PERMISSION_KEYS,
} from '../../common/access/access-modules';
import {
  ADMINISTRATOR_ROLE,
  LEGACY_SUPER_ADMIN_ROLE,
  ROLE_PRESETS,
  permissionsForPreset,
} from '../../common/access/access-presets';

/**
 * Anything that can run parameterised SQL — a `DataSource`, a `QueryRunner`,
 * or an `EntityManager`. Keeping the surface this narrow lets the same routine
 * serve both the tenant seeder and the access-control migration.
 */
export interface SqlRunner {
  query(sql: string, parameters?: unknown[]): Promise<any>;
}

export interface SyncAccessControlOptions {
  /**
   * Assign the Administrator role to every `isAdmin` user that holds no role
   * at all. Intended for the one-time migration and for freshly provisioned
   * tenants — never for a routine re-sync, where it would silently re-grant
   * access to a user whose roles were deliberately revoked.
   */
  backfillAdministrators?: boolean;
  /** Emit progress to stdout. */
  verbose?: boolean;
}

export interface SyncAccessControlResult {
  permissionsUpserted: number;
  permissionsPruned: number;
  rolesCreated: string[];
  usersBackfilled: number;
  administratorsAssigned: number;
}

/**
 * Bring a tenant database in line with the access-control registry.
 *
 * Idempotent by construction, and deliberately conservative: a preset role's
 * permission set and implications are written only when the role is first
 * created, so a tenant that has tailored "Sales Manager" keeps its edits
 * across upgrades. Permissions that have disappeared from the registry are
 * pruned; the `role_permissions` foreign key cascades, so roles lose the dead
 * keys along with them.
 */
export async function syncAccessControl(
  q: SqlRunner,
  options: SyncAccessControlOptions = {},
): Promise<SyncAccessControlResult> {
  const { backfillAdministrators = false, verbose = false } = options;
  const log = (msg: string) => {
    if (verbose) console.log(`  [access-control] ${msg}`);
  };

  const result: SyncAccessControlResult = {
    permissionsUpserted: 0,
    permissionsPruned: 0,
    rolesCreated: [],
    usersBackfilled: 0,
    administratorsAssigned: 0,
  };

  // ── 1. Permission catalogue ──────────────────────────────────────────────
  const catalogue = buildPermissionCatalogue();
  for (const entry of catalogue) {
    await q.query(
      `INSERT INTO "permissions" ("key", "name", "description", "module", "action")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("key") DO UPDATE
         SET "name" = EXCLUDED."name",
             "description" = EXCLUDED."description",
             "module" = EXCLUDED."module",
             "action" = EXCLUDED."action"`,
      [entry.key, entry.name, entry.description, entry.module, entry.action],
    );
  }
  result.permissionsUpserted = catalogue.length;
  log(`${catalogue.length} permissions upserted`);

  const pruned = await q.query(
    `DELETE FROM "permissions" WHERE "key" <> ALL($1::text[]) RETURNING "key"`,
    [ALL_PERMISSION_KEYS],
  );
  result.permissionsPruned = Array.isArray(pruned) ? pruned.length : 0;
  if (result.permissionsPruned) {
    log(`${result.permissionsPruned} obsolete permissions pruned`);
  }

  // ── 2. Legacy role rename ────────────────────────────────────────────────
  // Tenants provisioned before this rollout carry a `super_admin` role. Rename
  // it rather than creating a second all-powerful role beside it.
  await q.query(
    `UPDATE "roles" SET "name" = $1, "isSystem" = true, "category" = 'settings'
      WHERE "name" = $2
        AND NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = $1)`,
    [ADMINISTRATOR_ROLE, LEGACY_SUPER_ADMIN_ROLE],
  );

  // ── 3. Preset roles ──────────────────────────────────────────────────────
  const roleIdByName = new Map<string, number>();

  for (const preset of ROLE_PRESETS) {
    const existing = await q.query(
      `SELECT "id" FROM "roles" WHERE "name" = $1`,
      [preset.name],
    );

    if (existing.length) {
      const id: number = existing[0].id;
      roleIdByName.set(preset.name, id);
      // Metadata is safe to refresh; the permission set is not.
      await q.query(
        `UPDATE "roles"
            SET "description" = $2, "isSystem" = true, "category" = $3,
                "isSuperAdmin" = $4
          WHERE "id" = $1`,
        [id, preset.description, preset.category, preset.isSuperAdmin ?? false],
      );
      continue;
    }

    const inserted = await q.query(
      `INSERT INTO "roles" ("name", "description", "isSuperAdmin", "isSystem", "category")
       VALUES ($1, $2, $3, true, $4)
       RETURNING "id"`,
      [
        preset.name,
        preset.description,
        preset.isSuperAdmin ?? false,
        preset.category,
      ],
    );
    const id: number = inserted[0].id;
    roleIdByName.set(preset.name, id);
    result.rolesCreated.push(preset.name);

    const keys = permissionsForPreset(preset);
    if (keys.length) {
      await q.query(
        `INSERT INTO "role_permissions" ("roleId", "permissionId")
         SELECT $1, p."id" FROM "permissions" p WHERE p."key" = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [id, keys],
      );
    }
  }
  if (result.rolesCreated.length) {
    log(`roles created: ${result.rolesCreated.join(', ')}`);
  }

  // ── 4. Implications (only for roles created in this run) ─────────────────
  for (const preset of ROLE_PRESETS) {
    if (!result.rolesCreated.includes(preset.name)) continue;
    for (const impliedName of preset.implies ?? []) {
      const roleId = roleIdByName.get(preset.name);
      let impliedId = roleIdByName.get(impliedName);
      if (impliedId === undefined) {
        const rows = await q.query(
          `SELECT "id" FROM "roles" WHERE "name" = $1`,
          [impliedName],
        );
        impliedId = rows[0]?.id;
      }
      if (roleId === undefined || impliedId === undefined) continue;
      await q.query(
        `INSERT INTO "role_implications" ("roleId", "impliedRoleId")
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [roleId, impliedId],
      );
    }
  }

  // ── 5. Backfill the many-to-many from the deprecated single-role column ──
  const backfilled = await q.query(
    `INSERT INTO "user_roles" ("userId", "roleId")
     SELECT p."id", p."roleId" FROM "portal" p
      WHERE p."roleId" IS NOT NULL
        AND EXISTS (SELECT 1 FROM "roles" r WHERE r."id" = p."roleId")
     ON CONFLICT DO NOTHING
     RETURNING "userId"`,
  );
  result.usersBackfilled = Array.isArray(backfilled) ? backfilled.length : 0;
  if (result.usersBackfilled) {
    log(`${result.usersBackfilled} user role assignments carried over`);
  }

  // ── 6. Nobody who had access loses it ────────────────────────────────────
  if (backfillAdministrators) {
    const assigned = await q.query(
      `INSERT INTO "user_roles" ("userId", "roleId")
       SELECT p."id", r."id"
         FROM "portal" p
         CROSS JOIN "roles" r
        WHERE r."name" = $1
          AND p."isAdmin" = true
          AND NOT EXISTS (
            SELECT 1 FROM "user_roles" ur WHERE ur."userId" = p."id"
          )
       ON CONFLICT DO NOTHING
       RETURNING "userId"`,
      [ADMINISTRATOR_ROLE],
    );
    result.administratorsAssigned = Array.isArray(assigned)
      ? assigned.length
      : 0;
    if (result.administratorsAssigned) {
      log(
        `${result.administratorsAssigned} existing admin(s) assigned the Administrator role`,
      );
    }
  }

  return result;
}

/** Seeder entry point used by `runSeeders` / `runTenantSeeders`. */
export async function seedAccessControl(dataSource: SqlRunner): Promise<void> {
  console.log('🔐 Seeding access control (permissions, roles)...');
  const result = await syncAccessControl(dataSource, {
    backfillAdministrators: true,
    verbose: true,
  });
  console.log(
    `✅ Access control seeded — ${result.permissionsUpserted} permissions, ${ROLE_PRESETS.length} preset roles`,
  );
}
