import { EntityManager, In } from 'typeorm';
import { UnitOfMeasure } from '../../modules/inventory/entities/unit-of-measure.entity';
import { SeederDefinition } from './seeder.types';

const UOM_CATEGORIES = [
  {
    name: 'Unit',
    units: [
      {
        name: 'Units',
        code: 'UNIT',
        category: 'Unit',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Dozen',
        code: 'DOZ',
        category: 'Unit',
        ratio: 12,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Hundred',
        code: '100S',
        category: 'Unit',
        ratio: 100,
        roundingPrecision: '1',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Weight',
    units: [
      {
        name: 'Kilogram',
        code: 'KG',
        category: 'Weight',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Gram',
        code: 'G',
        category: 'Weight',
        ratio: 0.001,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Ton',
        code: 'T',
        category: 'Weight',
        ratio: 1000,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Pound',
        code: 'LB',
        category: 'Weight',
        ratio: 0.453592,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Ounce',
        code: 'OZ',
        category: 'Weight',
        ratio: 0.0283495,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Length',
    units: [
      {
        name: 'Meter',
        code: 'M',
        category: 'Length',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Centimeter',
        code: 'CM',
        category: 'Length',
        ratio: 0.01,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Millimeter',
        code: 'MM',
        category: 'Length',
        ratio: 0.001,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Kilometer',
        code: 'KM',
        category: 'Length',
        ratio: 1000,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Inch',
        code: 'IN',
        category: 'Length',
        ratio: 0.0254,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Foot',
        code: 'FT',
        category: 'Length',
        ratio: 0.3048,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Yard',
        code: 'YD',
        category: 'Length',
        ratio: 0.9144,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Volume',
    units: [
      {
        name: 'Liter',
        code: 'L',
        category: 'Volume',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Milliliter',
        code: 'ML',
        category: 'Volume',
        ratio: 0.001,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Cubic Meter',
        code: 'M3',
        category: 'Volume',
        ratio: 1000,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Cubic Centimeter',
        code: 'CM3',
        category: 'Volume',
        ratio: 0.001,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Gallon',
        code: 'GAL',
        category: 'Volume',
        ratio: 3.78541,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Quart',
        code: 'QT',
        category: 'Volume',
        ratio: 0.946353,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Area',
    units: [
      {
        name: 'Square Meter',
        code: 'M2',
        category: 'Area',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Square Centimeter',
        code: 'CM2',
        category: 'Area',
        ratio: 0.0001,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Square Kilometer',
        code: 'KM2',
        category: 'Area',
        ratio: 1000000,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Hectare',
        code: 'HA',
        category: 'Area',
        ratio: 10000,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Square Foot',
        code: 'FT2',
        category: 'Area',
        ratio: 0.092903,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Time',
    units: [
      {
        name: 'Hour',
        code: 'H',
        category: 'Time',
        ratio: 1,
        roundingPrecision: '0.01',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Minute',
        code: 'MIN',
        category: 'Time',
        ratio: 0.0166667,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Second',
        code: 'S',
        category: 'Time',
        ratio: 0.000277778,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Day',
        code: 'D',
        category: 'Time',
        ratio: 24,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Week',
        code: 'WK',
        category: 'Time',
        ratio: 168,
        roundingPrecision: '0.01',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
  {
    name: 'Packaging',
    units: [
      {
        name: 'Box',
        code: 'BOX',
        category: 'Packaging',
        ratio: 1,
        roundingPrecision: '1',
        isBaseUnit: true,
        isActive: true,
      },
      {
        name: 'Carton',
        code: 'CTN',
        category: 'Packaging',
        ratio: 1,
        roundingPrecision: '1',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Pallet',
        code: 'PLT',
        category: 'Packaging',
        ratio: 1,
        roundingPrecision: '1',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Case',
        code: 'CASE',
        category: 'Packaging',
        ratio: 1,
        roundingPrecision: '1',
        isBaseUnit: false,
        isActive: true,
      },
      {
        name: 'Pack',
        code: 'PACK',
        category: 'Packaging',
        ratio: 1,
        roundingPrecision: '1',
        isBaseUnit: false,
        isActive: true,
      },
    ],
  },
];

const UOM_CODES = UOM_CATEGORIES.flatMap((c) => c.units.map((u) => u.code));

export const uomSeeder: SeederDefinition = {
  key: 'uom',
  name: 'Units of measure',
  description:
    'Installs the reference unit catalogue (weight, length, volume, area, ' +
    'time, packaging) and links each unit to its category base unit.',

  async check(m: EntityManager) {
    const present = await m
      .getRepository(UnitOfMeasure)
      .countBy({ code: In(UOM_CODES) });
    const missing = UOM_CODES.length - present;
    return {
      missing,
      detail: missing
        ? `${missing} of ${UOM_CODES.length} units missing`
        : `All ${UOM_CODES.length} units present`,
    };
  },

  async run(m: EntityManager) {
    const repo = m.getRepository(UnitOfMeasure);
    let created = 0;

    for (const category of UOM_CATEGORIES) {
      const baseUnits: Record<string, UnitOfMeasure> = {};

      for (const unitData of category.units) {
        const existing = await repo.findOne({ where: { code: unitData.code } });

        if (!existing) {
          const saved = await repo.save(repo.create(unitData));
          if (unitData.isBaseUnit) baseUnits[category.name] = saved;
          created++;
        } else if (unitData.isBaseUnit) {
          baseUnits[category.name] = existing;
        }
      }

      // Derived units point at their category's base unit. Done in a second
      // pass because the base unit may be created after them.
      const baseUnit = baseUnits[category.name];
      if (!baseUnit) continue;

      for (const unitData of category.units) {
        if (unitData.isBaseUnit) continue;
        const unit = await repo.findOne({ where: { code: unitData.code } });
        if (unit && !unit.baseUnit) {
          unit.baseUnit = baseUnit;
          await repo.save(unit);
        }
      }
    }

    return {
      created,
      pruned: 0,
      detail: `${created} created, ${UOM_CODES.length - created} already present`,
    };
  },
};
