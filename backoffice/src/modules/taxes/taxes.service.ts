import { TaxRate, TaxesConfiguration } from './taxes.model';
import { CreateTaxRateDTO, UpdateTaxRateDTO } from './taxes.interface';
import { apiClient, API_ROUTES } from '../../common';

export class TaxesService {
  private configId: number | null = null;

  async getConfiguration(): Promise<TaxesConfiguration> {
    const response = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('taxes'));
    this.configId = response.data.id;
    return TaxesConfiguration.fromApiResponse(response.data.values);
  }

  async getAllRates(): Promise<TaxRate[]> {
    const config = await this.getConfiguration();
    return config.rates;
  }

  async createRate(data: CreateTaxRateDTO): Promise<TaxesConfiguration> {
    const config = await this.getConfiguration();
    const newRates = [...config.rates.map(r => r.toJSON())];

    // If setting as default, remove default from others
    if (data.isDefault) {
      newRates.forEach(r => r.isDefault = false);
    }

    newRates.push({
      name: data.name,
      rate: data.rate,
      isDefault: data.isDefault || false,
    });

    const newDefaultRate = newRates.find(r => r.isDefault)?.rate || config.defaultRate;

    return this.updateConfiguration({
      rates: newRates,
      defaultRate: newDefaultRate,
    });
  }

  async updateRate(index: number, data: UpdateTaxRateDTO): Promise<TaxesConfiguration> {
    const config = await this.getConfiguration();
    const newRates = config.rates.map(r => r.toJSON());

    if (index < 0 || index >= newRates.length) {
      throw new Error('Invalid tax rate index');
    }

    // If setting as default, remove default from others
    if (data.isDefault) {
      newRates.forEach(r => r.isDefault = false);
    }

    newRates[index] = {
      ...newRates[index],
      ...data,
    };

    const newDefaultRate = newRates.find(r => r.isDefault)?.rate || config.defaultRate;

    return this.updateConfiguration({
      rates: newRates,
      defaultRate: newDefaultRate,
    });
  }

  async deleteRate(index: number): Promise<TaxesConfiguration> {
    const config = await this.getConfiguration();
    const newRates = config.rates.map(r => r.toJSON()).filter((_, i) => i !== index);

    const newDefaultRate = newRates.find(r => r.isDefault)?.rate || (newRates[0]?.rate || 0);

    return this.updateConfiguration({
      rates: newRates,
      defaultRate: newDefaultRate,
    });
  }

  private async updateConfiguration(values: any): Promise<TaxesConfiguration> {
    if (!this.configId) {
      await this.getConfiguration();
    }
    const response = await apiClient.put<any>(API_ROUTES.CONFIGURATIONS.UPDATE(this.configId!), { values });
    return TaxesConfiguration.fromApiResponse(response.data.values);
  }
}

export const taxesService = new TaxesService();
