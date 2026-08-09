import { Company as ICompany } from './company.interface';

/** Trims a config value and collapses the blank placeholders to `null`. */
const clean = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export class Company implements ICompany {
  constructor(
    public companyName: string,
    public address: string | null = null,
    public zipCode: string | null = null,
    public city: string | null = null,
    public state: string | null = null,
    public country: string | null = null,
    public phone: string | null = null,
    public fax: string | null = null,
    public email: string | null = null,
    public website: string | null = null,
    public logo: string | null = null,
    public professions: string | null = null,
  ) {}

  static fromApiResponse(data: Record<string, unknown>): Company {
    return new Company(
      clean(data.companyName) ?? '',
      clean(data.address),
      clean(data.zipCode),
      clean(data.city),
      clean(data.state),
      clean(data.country),
      clean(data.phone),
      clean(data.fax),
      clean(data.email),
      clean(data.website),
      clean(data.logo),
      clean(data.professions),
    );
  }

  toJSON(): ICompany {
    return {
      companyName: this.companyName,
      address: this.address,
      zipCode: this.zipCode,
      city: this.city,
      state: this.state,
      country: this.country,
      phone: this.phone,
      fax: this.fax,
      email: this.email,
      website: this.website,
      logo: this.logo,
      professions: this.professions,
    };
  }
}

/**
 * `12 Rue X, 40000 Marrakech, Maroc` — joins whatever the back-office filled
 * in and returns `null` when the address is entirely unset.
 */
export const formatCompanyAddress = (company: ICompany): string | null => {
  const cityLine = [company.zipCode, company.city].filter(Boolean).join(' ');
  const parts = [company.address, cityLine, company.state, company.country].filter(
    (part): part is string => !!part && part.length > 0,
  );
  return parts.length > 0 ? parts.join(', ') : null;
};
