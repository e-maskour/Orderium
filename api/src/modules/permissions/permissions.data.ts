import { Permission } from './entities/permission.entity';

type PermissionSeed = Omit<
  Permission,
  'id' | 'roles' | 'dateCreated' | 'dateUpdated'
>;

function p(
  module: string,
  action: string,
  name: string,
  description: string,
): PermissionSeed {
  return { key: `${module}.${action}`, name, description, module, action };
}

/** Default permissions seeded for every tenant */
export const DEFAULT_PERMISSIONS: PermissionSeed[] = [
  // Dashboard
  p('statistics', 'view', 'View Statistics', 'View dashboard statistics'),
  // Products
  p('products', 'view', 'View Products', 'List and view product details'),
  p('products', 'create', 'Create Products', 'Create new products'),
  p('products', 'edit', 'Edit Products', 'Edit existing products'),
  p('products', 'delete', 'Delete Products', 'Delete products'),
  // Categories
  p('categories', 'view', 'View Categories', 'List and view categories'),
  p('categories', 'create', 'Create Categories', 'Create new categories'),
  p('categories', 'edit', 'Edit Categories', 'Edit categories'),
  p('categories', 'delete', 'Delete Categories', 'Delete categories'),
  // Orders
  p('orders', 'view', 'View Orders', 'List and view order details'),
  p('orders', 'create', 'Create Orders', 'Create new orders'),
  p('orders', 'edit', 'Edit Orders', 'Edit orders'),
  p('orders', 'delete', 'Delete Orders', 'Delete orders'),
  // Invoices
  p('invoices', 'view', 'View Invoices', 'List and view invoices'),
  p('invoices', 'create', 'Create Invoices', 'Create invoices'),
  p('invoices', 'edit', 'Edit Invoices', 'Edit invoices'),
  p('invoices', 'delete', 'Delete Invoices', 'Delete invoices'),
  // Quotes
  p('quotes', 'view', 'View Quotes', 'List and view quotes'),
  p('quotes', 'create', 'Create Quotes', 'Create quotes'),
  p('quotes', 'edit', 'Edit Quotes', 'Edit quotes'),
  p('quotes', 'delete', 'Delete Quotes', 'Delete quotes'),
  // Partners
  p('partners', 'view', 'View Partners', 'List and view partners'),
  p('partners', 'create', 'Create Partners', 'Create partners'),
  p('partners', 'edit', 'Edit Partners', 'Edit partners'),
  p('partners', 'delete', 'Delete Partners', 'Delete partners'),
  // Payments
  p('payments', 'view', 'View Payments', 'List and view payments'),
  p('payments', 'create', 'Create Payments', 'Record payments'),
  p('payments', 'edit', 'Edit Payments', 'Edit payments'),
  p('payments', 'delete', 'Delete Payments', 'Delete payments'),
  // Inventory
  p('inventory', 'view', 'View Inventory', 'View stock and inventory'),
  p(
    'inventory',
    'manage',
    'Manage Inventory',
    'Adjust stock and manage warehouses',
  ),
  // Delivery
  p('delivery', 'view', 'View Delivery', 'View delivery persons and orders'),
  p('delivery', 'manage', 'Manage Delivery', 'Manage delivery assignments'),
  // Configurations
  p(
    'configurations',
    'view',
    'View Configurations',
    'View system configurations',
  ),
  p(
    'configurations',
    'manage',
    'Manage Configurations',
    'Edit system configurations',
  ),
  // Drive
  p('drive', 'view', 'View Drive', 'Access drive files'),
  p('drive', 'manage', 'Manage Drive', 'Upload and manage drive files'),
  // POS
  p('pos', 'use', 'Use POS', 'Access Point of Sale'),
  // Users
  p('users', 'view', 'View Users', 'List and view users'),
  p('users', 'create', 'Create Users', 'Create new users'),
  p('users', 'edit', 'Edit Users', 'Edit users'),
  p('users', 'delete', 'Delete Users', 'Delete users'),
  // Roles
  p('roles', 'view', 'View Roles', 'List and view roles'),
  p('roles', 'create', 'Create Roles', 'Create roles'),
  p('roles', 'edit', 'Edit Roles', 'Edit roles and permissions'),
  p('roles', 'delete', 'Delete Roles', 'Delete roles'),
];
