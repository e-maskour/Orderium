import { Company } from './company.model';
import { UpdateCompanyDTO } from './company.interface';
import { apiClient, API_ROUTES } from '../../common';

export class CompanyService {
  async getCompanyInfo(): Promise<Company> {
    const response = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('my_company'));
    return Company.fromApiResponse(response.data.values);
  }

  async updateCompanyInfo(data: UpdateCompanyDTO): Promise<Company> {
    const getResponse = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('my_company'));
    const configId = getResponse.data.id;
    const response = await apiClient.patch<any>(API_ROUTES.CONFIGURATIONS.UPDATE(configId), {
      values: data,
    });
    return Company.fromApiResponse(response.data.values);
  }

  /** Upload or replace the logo printed on documents. */
  async uploadLogo(file: File): Promise<Company> {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.upload<any>(API_ROUTES.CONFIGURATIONS.COMPANY_LOGO, formData);
    return Company.fromApiResponse(response.data);
  }

  async removeLogo(): Promise<Company> {
    const response = await apiClient.delete<any>(API_ROUTES.CONFIGURATIONS.COMPANY_LOGO);
    return Company.fromApiResponse(response.data);
  }
}

export const companyService = new CompanyService();
