import { http } from '@/services/httpClient';
import { API_ROUTES } from '@/common/api-routes';
import { Company } from './company.model';
import { CompanyResponse } from './company.interface';

export class CompanyService {
  /**
   * Reads the public `my_company` configuration. The endpoint returns the whole
   * configuration row, so the contact details live under `data.values`.
   */
  async get(): Promise<CompanyResponse> {
    const response = await http<{ data: { values?: Record<string, unknown> } | null }>(
      API_ROUTES.PORTAL.CONFIG_COMPANY,
    );
    const values = response.data?.values;
    return { company: values ? Company.fromApiResponse(values) : null };
  }
}

export const companyService = new CompanyService();
