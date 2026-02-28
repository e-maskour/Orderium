export interface ITaxRate {
  name: string;
  rate: number;
  isDefault: boolean;
}

export interface ITaxesConfig {
  defaultRate: number;
  rates: ITaxRate[];
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
