export interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

export interface CurrenciesConfig {
  default: string;
  currencies: Currency[];
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
