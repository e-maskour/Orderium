import { ICurrency, ICurrenciesConfig } from './currencies.interface';

export class Currency implements ICurrency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;

  constructor(data: ICurrency) {
    this.code = data.code;
    this.name = data.name;
    this.symbol = data.symbol;
    this.isDefault = data.isDefault;
  }

  get displayName(): string {
    return `${this.name} (${this.code})`;
  }

  get shortDisplay(): string {
    return `${this.symbol} ${this.code}`;
  }

  get statusBadge(): string {
    return this.isDefault ? 'Default' : '';
  }

  formatAmount(amount: number): string {
    return `${this.symbol}${amount.toFixed(2)}`;
  }

  static fromApiResponse(data: any): Currency {
    return new Currency({
      code: data.code,
      name: data.name,
      symbol: data.symbol,
      isDefault: data.isDefault || false,
    });
  }

  toJSON(): ICurrency {
    return {
      code: this.code,
      name: this.name,
      symbol: this.symbol,
      isDefault: this.isDefault,
    };
  }
}

export class CurrenciesConfiguration {
  default: string;
  currencies: Currency[];

  constructor(data: ICurrenciesConfig) {
    this.default = data.default;
    this.currencies = data.currencies.map(c => new Currency(c));
  }

  getDefaultCurrency(): Currency | undefined {
    return this.currencies.find(c => c.isDefault);
  }

  getCurrencyByCode(code: string): Currency | undefined {
    return this.currencies.find(c => c.code === code);
  }

  get count(): number {
    return this.currencies.length;
  }

  get currencyCodes(): string[] {
    return this.currencies.map(c => c.code);
  }

  static fromApiResponse(data: any): CurrenciesConfiguration {
    return new CurrenciesConfiguration({
      default: data.default || '',
      currencies: (data.currencies || []).map((c: any) => Currency.fromApiResponse(c)),
    });
  }

  toJSON(): ICurrenciesConfig {
    return {
      default: this.default,
      currencies: this.currencies.map(c => c.toJSON()),
    };
  }
}
