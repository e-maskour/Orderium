import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolesPermissionsAndUsersModule1773000000000
    implements MigrationInterface {
    name = 'CreateRolesPermissionsAndUsersModule1773000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── 1. Permissions table ──────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id" SERIAL NOT NULL,
        "key" character varying(100) NOT NULL,
        "name" character varying(255) NOT NULL,
        "description" text,
        "module" character varying(100) NOT NULL,
        "action" character varying(50) NOT NULL,
        "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
        "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_permissions_key" UNIQUE ("key"),
        CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_permissions_key" ON "permissions" ("key")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_permissions_module" ON "permissions" ("module")`,
        );

        // ── 2. Roles table ────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" text,
        "isSuperAdmin" boolean NOT NULL DEFAULT false,
        "dateCreated" TIMESTAMP NOT NULL DEFAULT now(),
        "dateUpdated" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
        CONSTRAINT "PK_roles" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_roles_name" ON "roles" ("name")`,
        );

        // ── 3. Role ↔ Permission join table ──────────────────────
        await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "roleId" integer NOT NULL,
        "permissionId" integer NOT NULL,
        CONSTRAINT "PK_role_permissions" PRIMARY KEY ("roleId", "permissionId")
      )
    `);
        await queryRunner.query(
            `CREATE INDEX "IDX_role_permissions_roleId" ON "role_permissions" ("roleId")`,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_role_permissions_permissionId" ON "role_permissions" ("permissionId")`,
        );

        // ── 4. Extend portal table ────────────────────────────────
        await queryRunner.query(
            `ALTER TABLE "portal" ADD COLUMN IF NOT EXISTS "userType" character varying(20) NOT NULL DEFAULT 'client'`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" ADD COLUMN IF NOT EXISTS "avatarUrl" text`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" ADD COLUMN IF NOT EXISTS "roleId" integer`,
        );

        // ── 5. Foreign keys ───────────────────────────────────────
        await queryRunner.query(
            `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_role_permissions_permission" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" ADD CONSTRAINT "FK_portal_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );

        // ── 6. Seed default super_admin role ─────────────────────
        await queryRunner.query(`
      INSERT INTO "roles" ("name", "description", "isSuperAdmin")
      VALUES ('super_admin', 'Full access — bypasses all permission checks', true)
      ON CONFLICT ("name") DO NOTHING
    `);

        // ── 7. Seed all default permissions ──────────────────────
        const defaultPermissions = [
            ['statistics.view', 'View Statistics', 'View dashboard statistics', 'statistics', 'view'],
            ['products.view', 'View Products', 'List and view product details', 'products', 'view'],
            ['products.create', 'Create Products', 'Create new products', 'products', 'create'],
            ['products.edit', 'Edit Products', 'Edit existing products', 'products', 'edit'],
            ['products.delete', 'Delete Products', 'Delete products', 'products', 'delete'],
            ['categories.view', 'View Categories', 'List and view categories', 'categories', 'view'],
            ['categories.create', 'Create Categories', 'Create new categories', 'categories', 'create'],
            ['categories.edit', 'Edit Categories', 'Edit categories', 'categories', 'edit'],
            ['categories.delete', 'Delete Categories', 'Delete categories', 'categories', 'delete'],
            ['orders.view', 'View Orders', 'List and view order details', 'orders', 'view'],
            ['orders.create', 'Create Orders', 'Create new orders', 'orders', 'create'],
            ['orders.edit', 'Edit Orders', 'Edit orders', 'orders', 'edit'],
            ['orders.delete', 'Delete Orders', 'Delete orders', 'orders', 'delete'],
            ['invoices.view', 'View Invoices', 'List and view invoices', 'invoices', 'view'],
            ['invoices.create', 'Create Invoices', 'Create invoices', 'invoices', 'create'],
            ['invoices.edit', 'Edit Invoices', 'Edit invoices', 'invoices', 'edit'],
            ['invoices.delete', 'Delete Invoices', 'Delete invoices', 'invoices', 'delete'],
            ['quotes.view', 'View Quotes', 'List and view quotes', 'quotes', 'view'],
            ['quotes.create', 'Create Quotes', 'Create quotes', 'quotes', 'create'],
            ['quotes.edit', 'Edit Quotes', 'Edit quotes', 'quotes', 'edit'],
            ['quotes.delete', 'Delete Quotes', 'Delete quotes', 'quotes', 'delete'],
            ['partners.view', 'View Partners', 'List and view partners', 'partners', 'view'],
            ['partners.create', 'Create Partners', 'Create partners', 'partners', 'create'],
            ['partners.edit', 'Edit Partners', 'Edit partners', 'partners', 'edit'],
            ['partners.delete', 'Delete Partners', 'Delete partners', 'partners', 'delete'],
            ['payments.view', 'View Payments', 'List and view payments', 'payments', 'view'],
            ['payments.create', 'Create Payments', 'Record payments', 'payments', 'create'],
            ['payments.edit', 'Edit Payments', 'Edit payments', 'payments', 'edit'],
            ['payments.delete', 'Delete Payments', 'Delete payments', 'payments', 'delete'],
            ['inventory.view', 'View Inventory', 'View stock and inventory', 'inventory', 'view'],
            ['inventory.manage', 'Manage Inventory', 'Adjust stock and manage warehouses', 'inventory', 'manage'],
            ['delivery.view', 'View Delivery', 'View delivery persons and orders', 'delivery', 'view'],
            ['delivery.manage', 'Manage Delivery', 'Manage delivery assignments', 'delivery', 'manage'],
            ['configurations.view', 'View Configurations', 'View system configurations', 'configurations', 'view'],
            ['configurations.manage', 'Manage Configurations', 'Edit system configurations', 'configurations', 'manage'],
            ['drive.view', 'View Drive', 'Access drive files', 'drive', 'view'],
            ['drive.manage', 'Manage Drive', 'Upload and manage drive files', 'drive', 'manage'],
            ['pos.use', 'Use POS', 'Access Point of Sale', 'pos', 'use'],
            ['users.view', 'View Users', 'List and view users', 'users', 'view'],
            ['users.create', 'Create Users', 'Create new users', 'users', 'create'],
            ['users.edit', 'Edit Users', 'Edit users', 'users', 'edit'],
            ['users.delete', 'Delete Users', 'Delete users', 'users', 'delete'],
            ['roles.view', 'View Roles', 'List and view roles', 'roles', 'view'],
            ['roles.create', 'Create Roles', 'Create roles', 'roles', 'create'],
            ['roles.edit', 'Edit Roles', 'Edit roles and permissions', 'roles', 'edit'],
            ['roles.delete', 'Delete Roles', 'Delete roles', 'roles', 'delete'],
        ];

        for (const [key, name, description, module, action] of defaultPermissions) {
            await queryRunner.query(
                `INSERT INTO "permissions" ("key", "name", "description", "module", "action")
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT ("key") DO NOTHING`,
                [key, name, description, module, action],
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "portal" DROP CONSTRAINT IF EXISTS "FK_portal_role"`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_role_permissions_permission"`,
        );
        await queryRunner.query(
            `ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "FK_role_permissions_role"`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" DROP COLUMN IF EXISTS "roleId"`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" DROP COLUMN IF EXISTS "avatarUrl"`,
        );
        await queryRunner.query(
            `ALTER TABLE "portal" DROP COLUMN IF EXISTS "userType"`,
        );
        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);
    }
}
