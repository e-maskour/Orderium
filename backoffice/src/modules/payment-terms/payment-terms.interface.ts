export interface PaymentTerm {
  key: string;
  label: string;
  days: number;
  isDefault: boolean;
}

export interface PaymentTermsConfig {
  default: string;
  terms: PaymentTerm[];
}

export interface CreatePaymentTermDTO {
  key: string;
  label: string;
  days: number;
  isDefault?: boolean;
}

export interface UpdatePaymentTermDTO {
  key?: string;
  label?: string;
  days?: number;
  isDefault?: boolean;
}
