export interface IPaymentTerm {
  key: string;
  label: string;
  days: number;
  isDefault: boolean;
}

export interface IPaymentTermsConfig {
  default: string;
  terms: IPaymentTerm[];
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
