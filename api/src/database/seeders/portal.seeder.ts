import { EntityManager } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Portal } from '../../modules/portal/entities/portal.entity';
import {
  SeederDefinition,
  SeederOptionDef,
  SeederOptionError,
  SeederOptions,
  requireString,
} from './seeder.types';

/**
 * Creates a tenant's first administrator.
 *
 * Credentials are supplied by the caller, never defaulted. An earlier version
 * of this seeder hard-coded the password `123456`, which was tolerable while it
 * only ever ran on a developer's laptop but is not once the seeder is reachable
 * from the super-admin console against production tenants.
 */
const OPTIONS: SeederOptionDef[] = [
  {
    key: 'name',
    label: 'Username',
    type: 'text',
    required: true,
    minLength: 3,
    placeholder: 'admin',
  },
  {
    key: 'phoneNumber',
    label: 'Phone number',
    type: 'text',
    required: true,
    minLength: 6,
    placeholder: '06XXXXXXXX',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'text',
    required: true,
    minLength: 5,
    placeholder: 'admin@example.com',
  },
  {
    key: 'password',
    label: 'Password',
    type: 'password',
    required: true,
    minLength: 12,
    danger:
      'Creates a login-capable account with full admin rights on this tenant.',
  },
];

const byKey = (key: string): SeederOptionDef =>
  OPTIONS.find((o) => o.key === key) as SeederOptionDef;

export const portalSeeder: SeederDefinition = {
  key: 'portal',
  name: 'Portal admin user',
  description:
    'Creates the tenant’s first administrator account. Requires credentials — ' +
    'nothing is defaulted. Normally handled by onboarding; use this to recover ' +
    'a tenant left without an admin.',
  privileged: true,
  options: OPTIONS,

  async check(m: EntityManager) {
    const admins = await m
      .getRepository(Portal)
      .countBy({ isAdmin: true, isActive: true });
    return admins > 0
      ? { missing: 0, detail: `${admins} active admin user(s)` }
      : { missing: 1, detail: 'No active admin user' };
  },

  async run(m: EntityManager, options?: SeederOptions) {
    const name = requireString(options, byKey('name'));
    const phoneNumber = requireString(options, byKey('phoneNumber'));
    const email = requireString(options, byKey('email'));
    const password = requireString(options, byKey('password'));

    const repo = m.getRepository(Portal);

    // Idempotent like every other seeder: a tenant that already has an admin
    // is converged, so re-running is a no-op rather than an error.
    const existingAdmin = await repo.countBy({ isAdmin: true, isActive: true });
    if (existingAdmin > 0) {
      return {
        created: 0,
        pruned: 0,
        detail: 'Tenant already has an active admin — skipped',
      };
    }

    // No admin, but these credentials collide with some other account. That is
    // a real conflict the caller has to resolve, not something to skip past.
    const clash = await repo.findOne({ where: [{ name }, { phoneNumber }] });
    if (clash) {
      throw new SeederOptionError(
        'That username or phone number is already taken on this tenant.',
      );
    }

    await repo.save(
      repo.create({
        name,
        phoneNumber,
        email,
        password: await bcrypt.hash(password, 10),
        isAdmin: true,
        isCustomer: false,
        isActive: true,
      }),
    );

    return { created: 1, pruned: 0, detail: `Created admin user "${name}"` };
  },
};
