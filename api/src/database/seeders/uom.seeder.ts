import { DataSource } from 'typeorm';
import { UnitOfMeasure } from '../../modules/inventory/entities/unit-of-measure.entity';

export async function seedUnitOfMeasures(dataSource: DataSource) {
  const uomRepository = dataSource.getRepository(UnitOfMeasure);

  const categories = [
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

  for (const category of categories) {
    // First, create base units
    const baseUnits: Record<string, UnitOfMeasure> = {};
    
    for (const unitData of category.units) {
      const existing = await uomRepository.findOne({
        where: { code: unitData.code },
      });

      if (!existing) {
        const unit = uomRepository.create(unitData);
        const savedUnit = await uomRepository.save(unit);
        
        if (unitData.isBaseUnit) {
          baseUnits[category.name] = savedUnit;
        }
        
        console.log(`✓ Created UOM: ${unitData.name} (${unitData.code})`);
      } else {
        console.log(`- UOM already exists: ${unitData.name} (${unitData.code})`);
        
        if (unitData.isBaseUnit) {
          baseUnits[category.name] = existing;
        }
      }
    }

    // Then update non-base units with baseUnit reference
    const baseUnit = baseUnits[category.name];
    if (baseUnit) {
      for (const unitData of category.units) {
        if (!unitData.isBaseUnit) {
          const unit = await uomRepository.findOne({
            where: { code: unitData.code },
          });
          
          if (unit && !unit.baseUnit) {
            unit.baseUnit = baseUnit;
            await uomRepository.save(unit);
          }
        }
      }
    }
  }
}
