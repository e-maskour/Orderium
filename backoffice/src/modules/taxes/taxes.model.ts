import { TaxRate as ITaxRate, TaxesConfig } from './taxes.interface';

export class TaxRate implements ITaxRate {
  name: string;
  rate: number;
  isDefault: boolean;

  constructor(data: ITaxRate) {
    this.name = data.name;
    this.rate = data.rate;
    this.isDefault = data.isDefault;
  }

  get displayRate(): string {
    return `${this.rate}%`;
  }

  get statusBadge(): string {
    return this.isDefault ? 'Default' : '';
  }

  calculateTax(amount: number): number {
    return amount * (this.rate / 100);
  }

  calculateTotalWithTax(amount: number): number {
    return amount + this.calculateTax(amount);
  }

  static fromApiResponse(data: any): TaxRate {
    return new TaxRate({
      name: data.name,
      rate: parseFloat(data.rate) || 0,
      isDefault: data.isDefault || false,
    });
  }

  toJSON(): ITaxRate {
    return {
      name: this.name,
      rate: this.rate,
      isDefault: this.isDefault,
    };
  }
}

export class TaxesConfiguration {
  defaultRate: number;
  rates: TaxRate[];

  constructor(data: TaxesConfig) {
    this.defaultRate = data.defaultRate;
    this.rates = data.rates.map(r => new TaxRate(r));
  }

  getDefaultTaxRate(): TaxRate | undefined {
    return this.rates.find(r => r.isDefault);
  }

  getTaxRateByName(name: string): TaxRate | undefined {
    return this.rates.find(r => r.name === name);
  }

  static fromApiResponse(data: any): TaxesConfiguration {
    return new TaxesConfiguration({
      defaultRate: parseFloat(data.defaultRate) || 0,
      rates: (data.rates || []).map((r: any) => TaxRate.fromApiResponse(r)),
    });
  }
}
