import { Company } from './company.model';
import { ICompany, UpdateCompanyDTO } from './company.interface';
import { apiClient, API_ROUTES } from '../../common';

export class CompanyService {
  async getCompanyInfo(): Promise<Company> {
    const response = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('my_company'));
    return Company.fromApiResponse(response.data.values);
  }

  async updateCompanyInfo(data: UpdateCompanyDTO): Promise<Company> {
    const getResponse = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('my_company'));
    const configId = getResponse.data.id;
    const response = await apiClient.put<any>(API_ROUTES.CONFIGURATIONS.UPDATE(configId), { values: data });
    return Company.fromApiResponse(response.data.values);
  }
}

export const companyService = new CompanyService();
