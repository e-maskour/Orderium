export interface TaxRate {
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface TaxesConfig {
  defaultRate: number;
  rates: TaxRate[];
}

export interface CreateTaxRateDTO {
  name: string;
  rate: number;
  isDefault?: boolean;
}

export interface UpdateTaxRateDTO {
  name?: string;
  rate?: number;
  isDefault?: boolean;
}
