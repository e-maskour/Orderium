import { Company } from './company.model';
import { CompanyInfo, UpdateCompanyDTO } from './company.interface';

const API_URL = '/api';

export class CompanyService {
  async getCompanyInfo(): Promise<Company> {
    const response = await fetch(`${API_URL}/configurations/entity/my_company`);
    if (!response.ok) throw new Error('Failed to fetch company information');
    const data = await response.json();
    return Company.fromApiResponse(data.configuration.values);
  }

  async updateCompanyInfo(data: UpdateCompanyDTO): Promise<Company> {
    // First, get the configuration to obtain its ID
    const getResponse = await fetch(`${API_URL}/configurations/entity/my_company`);
    if (!getResponse.ok) throw new Error('Failed to fetch company information');
    const currentData = await getResponse.json();
    const configId = currentData.configuration.id;

    // Now update using the ID
    const response = await fetch(`${API_URL}/configurations/${configId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: data }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update company information');
    }

    const result = await response.json();
    return Company.fromApiResponse(result.configuration.values);
  }
}

export const companyService = new CompanyService();
