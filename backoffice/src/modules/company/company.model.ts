import { ICompany } from './company.interface';
import { formatAmount } from '@orderium/ui';

export class Company implements ICompany {
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
  vatNumber?: string;
  ice?: string;
  taxId?: string;
  registrationNumber?: string;
  legalStructure?: string;
  capital?: number;
  fiscalYearStartMonth?: number;

  constructor(data: ICompany) {
    this.companyName = data.companyName;
    this.address = data.address;
    this.zipCode = data.zipCode;
    this.city = data.city;
    this.country = data.country;
    this.state = data.state;
    this.phone = data.phone;
    this.fax = data.fax;
    this.email = data.email;
    this.website = data.website;
    this.logo = data.logo;
    this.professions = data.professions;
    this.vatNumber = data.vatNumber;
    this.ice = data.ice;
    this.taxId = data.taxId;
    this.registrationNumber = data.registrationNumber;
    this.legalStructure = data.legalStructure;
    this.capital = data.capital;
    this.fiscalYearStartMonth = data.fiscalYearStartMonth;
  }

  get hasLogo(): boolean {
    return !!this.logo;
  }

  get fullAddress(): string {
    const parts = [this.address, this.zipCode, this.city, this.state, this.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'No address';
  }

  get hasContactInfo(): boolean {
    return !!(this.phone || this.email || this.website);
  }

  get hasLegalIdentifiers(): boolean {
    return !!(this.vatNumber || this.ice || this.taxId || this.registrationNumber);
  }

  get displayCapital(): string {
    if (this.capital == null) return 'N/A';
    return formatAmount(this.capital, 2);
  }

  get fiscalYearStartMonthName(): string {
    if (this.fiscalYearStartMonth == null) return 'N/A';
    const date = new Date(2000, this.fiscalYearStartMonth - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  }

  static fromApiResponse(data: any): Company {
    return new Company(data);
  }

  toUpdateDTO(): ICompany {
    return this.toJSON();
  }

  toJSON(): ICompany {
    return {
      companyName: this.companyName,
      address: this.address,
      zipCode: this.zipCode,
      city: this.city,
      country: this.country,
      state: this.state,
      phone: this.phone,
      fax: this.fax,
      email: this.email,
      website: this.website,
      logo: this.logo,
      professions: this.professions,
      vatNumber: this.vatNumber,
      ice: this.ice,
      taxId: this.taxId,
      registrationNumber: this.registrationNumber,
      legalStructure: this.legalStructure,
      capital: this.capital,
      fiscalYearStartMonth: this.fiscalYearStartMonth,
    };
  }
}
