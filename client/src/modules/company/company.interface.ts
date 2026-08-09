/**
 * Public company details exposed to the portal through
 * `GET /api/portal/config/company` (the `my_company` configuration entity).
 *
 * Every field except the name is optional — the back-office seeds the row with
 * empty strings, so the support page must treat blanks as "not configured"
 * rather than rendering dead contact rows.
 */
export interface Company {
  companyName: string;
  address: string | null;
  zipCode: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  /** Object-storage key, absolute URL or data URI — run through `resolveMediaUrl`. */
  logo: string | null;
  professions: string | null;
}

export interface CompanyResponse {
  company: Company | null;
}
