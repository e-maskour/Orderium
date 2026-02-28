export interface ICurrency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

export interface ICurrenciesConfig {
  default: string;
  currencies: ICurrency[];
}

export interface CreateCurrencyDTO {
  code: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
}

export interface UpdateCurrencyDTO {
  code?: string;
  name?: string;
  symbol?: string;
  isDefault?: boolean;
}
