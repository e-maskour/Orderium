# Odoo-style Access Control — Design

**Date:** 2026-08-08
**Status:** Approved
**Scope:** `api/`, `backoffice/`

## Problem

Permission infrastructure exists but enforces nothing.

- `PermissionsGuard` and `@RequirePermission` are used on **zero** of the 44 controllers, and the
  guard is not registered in `app.module.ts` (only `ThrottlerGuard` and `JwtAuthGuard` are).
- `AuthContext.hasPermission()` in the backoffice is consumed nowhere; no sidebar entry and none of
  the ~90 routes are gated.
- The seed catalogue in `permissions.data.ts` covers 14 modules; the API exposes 44 controllers.
- Permissions are baked into the JWT, so a role edit has no effect until the user logs out.
- A user has at most one role (`Portal.roleId`), unlike Odoo where a user belongs to many groups.

Net effect: any authenticated admin can call any admin endpoint.

## Decisions

| Question | Decision |
| --- | --- |
| Depth | Groups + ACL + role inheritance. No record rules, no field-level rules. |
| Freshness | Live, server-resolved, cached with O(1) epoch invalidation. |
| Rollout | Migrate + backfill existing admins to an Administrator role. Fail-closed from day one. |
| User↔Role | Many-to-many, Odoo-faithful. |

## Concept mapping

| Odoo | Morocom |
| --- | --- |
| `res.groups` | `Role` |
| `res.groups.implied_ids` | `role_implications` self-M2M |
| `res.groups.category_id` | `category` on the module registry |
| `ir.model.access` | `Permission` (`module.action`) × `role_permissions` |
| `res.users.groups_id` | `user_roles` join table |
| menu `groups=` attribute | sidebar + route gating in the backoffice |

## Architecture

### 1. Module registry — `api/src/common/access/access-modules.ts`

A single code-level source of truth declaring every application module: its key, category, label,
available actions, and its **access levels**.

```ts
{ key: 'invoices', category: 'accounting', label: 'Invoices',
  actions: ['view', 'create', 'edit', 'delete', 'validate', 'export'],
  levels: { read:    ['view'],
            user:    ['view', 'create', 'edit', 'export'],
            manager: ['view', 'create', 'edit', 'delete', 'validate', 'export'] } }
```

Odoo shows a per-app radio (None / Read / User / Manager). Rather than materialising one group per
module-level pair, a level here is a **named bundle**: the Roles UI writes the matching permission
set and reads it back to display the level, or "Custom" when the set does not match a bundle
exactly. Same UX, no combinatorial explosion of roles.

This file drives permission seeding, the admin UI matrix, and the boot-time coverage assertion.

Permission key format is unchanged: `` `${module}.${action}` ``.

### 2. Schema

- **New** `user_roles (userId, roleId)` — effective rights are the union across all of a user's roles.
- **New** `role_implications (roleId, impliedRoleId)` — Manager implies User implies Read.
- **`Role`** gains `implies: Role[]`, `isSystem: boolean` (seeded presets, not deletable or
  renamable — mirrors Odoo's data-defined groups), and `category: string | null`.
- **`Permission`** shape unchanged; the catalogue grows to cover every controller.
- **`Portal.roleId`** is backfilled into `user_roles`, all reads migrate to the join table, and the
  column stays nullable and deprecated for one release before being dropped.

### 3. Resolution and caching — `AccessControlService`

`getEffectiveAccess(userId)` resolves user → roles → transitive closure of implications → union of
permission keys, returning `{ userId, roleIds, roleNames, isSuperAdmin, permissions }`.

Two cache layers, both through the existing `CacheModule` (Redis-backed when `REDIS_URL` is set, so
the cache is correct across multiple API instances):

- `tenant:{slug}:acl:v{epoch}:roles` — the whole role graph, one query per epoch.
- `tenant:{slug}:acl:v{epoch}:u{userId}` — a user's effective access, TTL 5 min.

Invalidation is O(1): a per-tenant `tenant:{slug}:acl:epoch` value is set to `Date.now()` on any
write to roles, role permissions, implications, or user-role assignments. Every cached entry is
orphaned instantly, so **a role edit lands on the very next request, for every logged-in user, on
every instance**. Seeding the epoch from `Date.now()` means a cache eviction can never resurrect an
older epoch's entries.

Closure traversal is iterative with a visited set, so cyclic implications cannot hang resolution.

### 4. Enforcement

`PermissionsGuard` is registered as an `APP_GUARD` after `JwtAuthGuard`.

Decorators:

- `@RequirePermission('invoices.create', ...)` — all listed permissions required.
- `@RequireAnyPermission('a.view', 'b.view')` — at least one required.
- `@NoPermissionRequired()` — explicit escape hatch (health, auth, onboarding, self-service).

Rules, in order:

1. `@Public()` routes pass.
2. Portal-scoped tokens pass — they are already constrained by `JwtAuthGuard` and `@PortalRoute()`;
   roles govern backoffice users only.
3. `@NoPermissionRequired()` passes.
4. Super-admin roles pass.
5. **Fail-closed**: an admin-scope route with no declaration is denied.

**Boot-time coverage assertion.** `AccessCoverageService` walks every registered controller handler
at application bootstrap and throws if an admin route declares neither a permission nor the escape
hatch, or if it references a permission key absent from the registry (catches typos). Set
`ACCESS_CONTROL_STRICT_BOOT=false` to downgrade to a warning. The same check runs as a Jest test so
CI fails before a deploy does.

### 5. API surface

- `GET /access/modules` — the registry, for the UI matrix.
- `GET /access/me` — the caller's effective permissions, roles, and super-admin flag.
- Roles CRUD accepts `impliedRoleIds` alongside `permissionIds`.
- Users accept `roleIds[]`.

JWT payload slims to `{ sub, phoneNumber, isAdmin, isCustomer, scope }`; `permissions[]`, `roleId`,
and `isSuperAdmin` come out of the token entirely.

### 6. Backoffice

- `AuthContext` fetches `/access/me` on login and on mount rather than trusting the token, and
  exposes `hasPermission`, `hasAnyPermission`, `hasAllPermissions`, and `canAccessModule`.
- `usePermissions()` hook, `<Can permission="...">` wrapper, and `<ProtectedRoute permission="...">`
  which redirects to a new 403 page.
- Sidebar entries carry permission keys and are filtered out when not granted — a user without
  accounting access does not see the section at all.
- `RolesPage` becomes the Odoo access matrix: category accordions, a per-module level radio, an
  Advanced expander with individual action checkboxes, and an implied-roles picker.
- `UsersPage` swaps its single-role dropdown for a multi-role picker.
- Full `fr_FR` and `ar_MA` translations.

### 7. Migration and rollout

A TypeORM migration (run per tenant database at provisioning, and for existing tenants through the
super-admin migrations controller) plus an idempotent `access-control.seeder.ts` added to
`runTenantSeeders`:

1. Create `user_roles` and `role_implications`; extend `roles`.
2. Seed the full permission catalogue from the registry.
3. Seed preset roles with implication chains: **Administrator** (super admin), Sales Manager →
   Sales User → Sales Read, Purchase Manager → Purchase User, Accounting Manager → Accounting
   User, Inventory Manager → Inventory User, POS Operator, and Read-Only.
4. Backfill `user_roles` from `portal.roleId`.
5. Assign Administrator to every `isAdmin = true` user still without a role.

Nobody loses access. Newly created users start with no roles and must be granted them.

### 8. Testing

- Unit: closure resolution over diamonds, cycles, and deep chains; union across multiple roles;
  super-admin bypass; epoch invalidation.
- Unit: guard behaviour for each decorator and for the fail-closed default.
- The route-coverage assertion also runs as a Jest test.
- E2E: editing a role takes effect on the next request from an already-authenticated session; a
  Sales User receives 403 on `invoices.delete`.

## Out of scope

Record rules (row-level domains) and field-level access. The registry and resolution service are
shaped so that a `record_rules` table keyed by module and role can be layered on later without
reworking either.
