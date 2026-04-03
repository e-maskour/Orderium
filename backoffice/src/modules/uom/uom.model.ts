import { IUnitOfMeasure, CreateUomDTO, UpdateUomDTO } from './uom.interface';

export class UnitOfMeasure implements IUnitOfMeasure {
  id?: number;
  name: string;
  code: string;
  category: string;
  ratio: number;
  roundingPrecision?: string;
  isBaseUnit: boolean;
  baseUnit?: UnitOfMeasure | null;
  baseUnitId?: number | null;
  isActive?: boolean;
  dateCreated?: string;
  dateUpdated?: string;

  constructor(data: IUnitOfMeasure) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.category = data.category;
    this.ratio = data.ratio;
    this.roundingPrecision = data.roundingPrecision;
    this.isBaseUnit = data.isBaseUnit;
    this.baseUnit = data.baseUnit ? new UnitOfMeasure(data.baseUnit) : data.baseUnit;
    this.baseUnitId = data.baseUnitId;
    this.isActive = data.isActive;
    this.dateCreated = data.dateCreated;
    this.dateUpdated = data.dateUpdated;
  }

  // Getters
  get displayName(): string {
    return `${this.name} (${this.code})`;
  }

  get displayLabel(): string {
    if (this.isBaseUnit) return `${this.code} (base)`;
    const base = this.baseUnit?.code || '';
    return base ? `${this.code} = ${this.ratio} ${base}` : this.code;
  }

  get statusText(): string {
    return this.isActive !== false ? 'Active' : 'Inactive';
  }

  get roundingValue(): number {
    const precision = parseInt(this.roundingPrecision ?? '2', 10);
    return Math.pow(10, -precision);
  }

  get categoryDisplayName(): string {
    const categoryLabels: Record<string, string> = {
      unit: 'Unit',
      weight: 'Weight',
      volume: 'Volume',
      length: 'Length',
      area: 'Area',
      time: 'Time',
    };
    return categoryLabels[this.category.toLowerCase()] ?? this.category;
  }

  get conversionLabel(): string {
    if (this.isBaseUnit) return `${this.code} (base unit)`;
    const base = this.baseUnit?.code ?? '';
    return base ? `1 ${this.code} = ${this.ratio} ${base}` : `ratio: ${this.ratio}`;
  }

  // Static factory method
  static fromApiResponse(data: any): UnitOfMeasure {
    return new UnitOfMeasure({
      id: data.id,
      name: data.name,
      code: data.code,
      category: data.category,
      ratio: parseFloat(data.ratio) || 1,
      roundingPrecision: data.roundingPrecision,
      isBaseUnit: data.isBaseUnit ?? false,
      baseUnit: data.baseUnit ? UnitOfMeasure.fromApiResponse(data.baseUnit) : data.baseUnit,
      baseUnitId: data.baseUnitId,
      isActive: data.isActive ?? true,
      dateCreated: data.dateCreated,
      dateUpdated: data.dateUpdated,
    });
  }

  toUpdateDTO(): UpdateUomDTO {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      ratio: this.ratio,
      roundingPrecision: this.roundingPrecision,
      isBaseUnit: this.isBaseUnit,
      baseUnitId: this.baseUnitId,
      isActive: this.isActive,
    };
  }

  toCreateDTO(): CreateUomDTO {
    return {
      name: this.name,
      code: this.code,
      category: this.category,
      ratio: this.ratio,
      roundingPrecision: this.roundingPrecision,
      isBaseUnit: this.isBaseUnit,
      baseUnitId: this.baseUnitId,
      isActive: this.isActive,
    };
  }

  toJSON(): IUnitOfMeasure {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      category: this.category,
      ratio: this.ratio,
      roundingPrecision: this.roundingPrecision,
      isBaseUnit: this.isBaseUnit,
      baseUnit: this.baseUnit?.toJSON(),
      baseUnitId: this.baseUnitId,
      isActive: this.isActive,
      dateCreated: this.dateCreated,
      dateUpdated: this.dateUpdated,
    };
  }
}
