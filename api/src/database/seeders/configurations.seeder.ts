import { EntityManager, In } from 'typeorm';
import { Configuration } from '../../modules/configurations/entities/configuration.entity';
import { SeederDefinition } from './seeder.types';

const DEFAULT_CONFIGURATIONS = [
  {
    entity: 'taxes',
    values: {
      defaultRate: 20,
      rates: [
        { name: 'Taux Normal', rate: 20, isDefault: true },
        { name: 'Taux Intermédiaire', rate: 14, isDefault: false },
        { name: 'Taux Réduit', rate: 10, isDefault: false },
        { name: 'Taux Super Réduit', rate: 7, isDefault: false },
        { name: 'Taux Zéro', rate: 0, isDefault: false },
      ],
    },
  },
  {
    entity: 'currencies',
    values: {
      default: 'MAD',
      currencies: [
        {
          code: 'MAD',
          name: 'Moroccan Dirham',
          symbol: 'DH',
          isDefault: true,
        },
        { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
        { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
      ],
    },
  },
  {
    entity: 'payment_terms',
    values: {
      default: 'immediate',
      terms: [
        { key: 'immediate', label: 'Immediate', days: 0, isDefault: true },
        { key: 'net_15', label: 'Net 15', days: 15, isDefault: false },
        { key: 'net_30', label: 'Net 30', days: 30, isDefault: false },
        { key: 'net_60', label: 'Net 60', days: 60, isDefault: false },
      ],
    },
  },
  {
    entity: 'my_company',
    values: {
      companyName: 'POS',
      address: '',
      zipCode: '40000',
      city: 'Marrakech',
      country: 'Maroc',
      state: 'Marrakech-Safi',
      phone: '',
      fax: '',
      email: '',
      website: '',
      logo: '',
      professions: '',
      vatNumber: '',
      ice: '',
      taxId: '',
      registrationNumber: '',
      legalStructure: '',
      capital: 0,
      fiscalYearStartMonth: 1,
    },
  },
];

const CONFIG_ENTITIES = DEFAULT_CONFIGURATIONS.map((c) => c.entity);

export const configurationsSeeder: SeederDefinition = {
  key: 'configurations',
  name: 'Configurations',
  description:
    'Installs default tax rates, currencies, payment terms and company details.',

  async check(m: EntityManager) {
    const present = await m
      .getRepository(Configuration)
      .countBy({ entity: In(CONFIG_ENTITIES) });
    const missing = CONFIG_ENTITIES.length - present;
    return {
      missing,
      detail: missing
        ? `${missing} of ${CONFIG_ENTITIES.length} configuration groups missing`
        : `All ${CONFIG_ENTITIES.length} configuration groups present`,
    };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(Configuration);
    const existing = await repo.find({
      where: { entity: In(CONFIG_ENTITIES) },
      select: { entity: true },
    });
    const have = new Set(existing.map((c) => c.entity));

    let created = 0;
    for (const config of DEFAULT_CONFIGURATIONS) {
      if (have.has(config.entity)) continue;
      await repo.save(repo.create(config));
      created++;
    }

    return {
      created,
      pruned: 0,
      detail: `${created} created, ${CONFIG_ENTITIES.length - created} already present`,
    };
  },
};
