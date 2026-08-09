import { EntityManager } from 'typeorm';
import {
  SeederDefinition,
  SeederOptionDef,
  SeederOptions,
  readBoolean,
} from './seeder.types';
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

/**
 * Rows actually returned by a `… RETURNING` statement.
 *
 * TypeORM's postgres driver hands back `[rows, affectedCount]` for
 * INSERT/UPDATE/DELETE, and a plain row array for SELECT. Treating the tuple
 * as the row list made every counter below report a constant 2 — including
 * `administratorsAssigned`, which claimed two admins had been granted the
 * Administrator role on runs that granted none.
 */
function returnedRows(result: unknown): unknown[] {
  if (
    Array.isArray(result) &&
    result.length === 2 &&
    Array.isArray(result[0]) &&
    typeof result[1] === 'number'
  ) {
    return result[0];
  }
  return Array.isArray(result) ? result : [];
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
  result.permissionsPruned = returnedRows(pruned).length;
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
  result.usersBackfilled = returnedRows(backfilled).length;
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
    result.administratorsAssigned = returnedRows(assigned).length;
    if (result.administratorsAssigned) {
      log(
        `${result.administratorsAssigned} existing admin(s) assigned the Administrator role`,
      );
    }
  }

  return result;
}

const BACKFILL_OPTION: SeederOptionDef = {
  key: 'backfillAdministrators',
  label: 'Also backfill administrators',
  type: 'boolean',
  danger:
    'Grants the Administrator role to every isAdmin user that currently holds ' +
    'no role at all. Correct once, at upgrade time. On a routine re-sync it ' +
    'silently re-grants access to anyone whose roles were deliberately revoked.',
};

export const accessControlSeeder: SeederDefinition = {
  key: 'access-control',
  name: 'Access control',
  description:
    'Synchronises the permission catalogue and preset roles with the registry. ' +
    'Permissions dropped from the registry are pruned; a preset role that ' +
    'already exists keeps any tailoring it has received.',
  options: [BACKFILL_OPTION],

  async check(m: EntityManager) {
    const presetNames = ROLE_PRESETS.map((p) => p.name);

    const count = async (sql: string): Promise<number> => {
      const rows: { count: number }[] = await m.query(sql, [
        ALL_PERMISSION_KEYS,
      ]);
      return Number(rows[0]?.count ?? 0);
    };

    const presentPerms = await count(
      'SELECT count(*)::int AS count FROM "permissions" WHERE "key" = ANY($1::text[])',
    );
    const obsolete = await count(
      'SELECT count(*)::int AS count FROM "permissions" WHERE "key" <> ALL($1::text[])',
    );

    const roleRows: { count: number }[] = await m.query(
      'SELECT count(*)::int AS count FROM "roles" WHERE "name" = ANY($1::text[])',
      [presetNames],
    );
    const presentRoles = Number(roleRows[0]?.count ?? 0);

    const missingPerms = ALL_PERMISSION_KEYS.length - presentPerms;
    const missingRoles = presetNames.length - presentRoles;

    // Obsolete rows count as drift: converged means "matches the registry",
    // not merely "contains everything the registry asks for".
    const missing = missingPerms + missingRoles + obsolete;

    if (missing === 0) {
      return {
        missing: 0,
        detail: `${ALL_PERMISSION_KEYS.length} permissions, ${presetNames.length} preset roles in sync`,
      };
    }

    const parts: string[] = [];
    if (missingPerms) parts.push(`${missingPerms} permission(s) missing`);
    if (missingRoles) parts.push(`${missingRoles} preset role(s) missing`);
    if (obsolete) parts.push(`${obsolete} obsolete permission(s) to prune`);
    return { missing, detail: parts.join(', ') };
  },

  async run(m: EntityManager, options?: SeederOptions) {
    const backfillAdministrators = readBoolean(options, BACKFILL_OPTION.key);

    const result = await syncAccessControl(m, { backfillAdministrators });

    const parts = [
      `${result.permissionsUpserted} permissions upserted`,
      `${result.rolesCreated.length} role(s) created`,
    ];
    if (result.permissionsPruned) {
      parts.push(`${result.permissionsPruned} pruned`);
    }
    if (result.usersBackfilled) {
      parts.push(`${result.usersBackfilled} legacy assignment(s) carried over`);
    }
    if (result.administratorsAssigned) {
      parts.push(
        `${result.administratorsAssigned} admin(s) granted Administrator`,
      );
    }

    return {
      created: result.permissionsUpserted + result.rolesCreated.length,
      pruned: result.permissionsPruned,
      detail: parts.join(', '),
    };
  },
};
