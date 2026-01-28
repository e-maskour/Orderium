import { CompanyInfo } from './company.interface';

export class Company implements CompanyInfo {
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

  constructor(data: CompanyInfo) {
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

  static fromApiResponse(data: any): Company {
    return new Company(data);
  }

  toJSON(): CompanyInfo {
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
