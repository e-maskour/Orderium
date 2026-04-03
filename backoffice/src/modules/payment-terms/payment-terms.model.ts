import { IPaymentTerm, IPaymentTermsConfig } from './payment-terms.interface';

export class PaymentTerm implements IPaymentTerm {
  key: string;
  label: string;
  days: number;
  isDefault: boolean;

  constructor(data: IPaymentTerm) {
    this.key = data.key;
    this.label = data.label;
    this.days = data.days;
    this.isDefault = data.isDefault;
  }

  get displayLabel(): string {
    return this.label;
  }

  get displayDays(): string {
    return `${this.days} day${this.days !== 1 ? 's' : ''}`;
  }

  get statusBadge(): string {
    return this.isDefault ? 'Default' : '';
  }

  get isImmediate(): boolean {
    return this.days === 0;
  }

  static fromApiResponse(data: any): PaymentTerm {
    return new PaymentTerm({
      key: data.key,
      label: data.label,
      days: parseInt(data.days) || 0,
      isDefault: data.isDefault || false,
    });
  }

  toJSON(): IPaymentTerm {
    return {
      key: this.key,
      label: this.label,
      days: this.days,
      isDefault: this.isDefault,
    };
  }
}

export class PaymentTermsConfiguration {
  default: string;
  terms: PaymentTerm[];

  constructor(data: IPaymentTermsConfig) {
    this.default = data.default;
    this.terms = data.terms.map((t) => new PaymentTerm(t));
  }

  getDefaultTerm(): PaymentTerm | undefined {
    return this.terms.find((t) => t.isDefault);
  }

  getTermByKey(key: string): PaymentTerm | undefined {
    return this.terms.find((t) => t.key === key);
  }

  get count(): number {
    return this.terms.length;
  }

  get sortedTerms(): PaymentTerm[] {
    return [...this.terms].sort((a, b) => a.days - b.days);
  }

  toJSON(): IPaymentTermsConfig {
    return {
      default: this.default,
      terms: this.terms.map((t) => t.toJSON()),
    };
  }

  static fromApiResponse(data: any): PaymentTermsConfiguration {
    return new PaymentTermsConfiguration({
      default: data.default || '',
      terms: (data.terms || []).map((t: any) => PaymentTerm.fromApiResponse(t)),
    });
  }
}
