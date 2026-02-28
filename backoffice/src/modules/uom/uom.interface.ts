export interface IUnitOfMeasure {
  id?: number;
  name: string;
  code: string;
  category: string;
  ratio: number;
  roundingPrecision?: string;
  isBaseUnit: boolean;
  baseUnit?: IUnitOfMeasure | null;
  baseUnitId?: number | null;
  isActive?: boolean;
  dateCreated?: string;
  dateUpdated?: string;
}

export interface CreateUomDTO {
  name: string;
  code: string;
  category: string;
  ratio?: number;
  roundingPrecision?: string;
  isBaseUnit?: boolean;
  baseUnitId?: number | null;
  isActive?: boolean;
}

export interface UpdateUomDTO {
  name?: string;
  code?: string;
  category?: string;
  ratio?: number;
  roundingPrecision?: string;
  isBaseUnit?: boolean;
  baseUnitId?: number | null;
  isActive?: boolean;
}

export const UOM_CATEGORIES = [
  'Unit',
  'Weight',
  'Length',
  'Volume',
  'Area',
  'Time',
  'Packaging',
  'Other',
] as const;

export type UomCategory = typeof UOM_CATEGORIES[number];
