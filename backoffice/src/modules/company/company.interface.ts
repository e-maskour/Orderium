export interface ICompany {
  // Basic Company Information
  companyName: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
  state?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  logo?: string;
  professions?: string;

  // Legal & Administrative Information
  vatNumber?: string;
  ice?: string;
  taxId?: string;
  registrationNumber?: string;
  legalStructure?: string;
  capital?: number;
  fiscalYearStartMonth?: number;
}

export interface UpdateCompanyDTO extends Partial<ICompany> {}
