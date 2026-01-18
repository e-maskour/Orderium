import { TaxRate, TaxesConfiguration } from './taxes.model';
import { CreateTaxRateDTO, UpdateTaxRateDTO } from './taxes.interface';

const API_URL = '/api';

export class TaxesService {
  private configId: number | null = null;

  async getConfiguration(): Promise<TaxesConfiguration> {
    const response = await fetch(`${API_URL}/configurations/entity/taxes`);
    if (!response.ok) throw new Error('Failed to fetch tax configuration');
    const data = await response.json();
    
    this.configId = data.configuration.id;
    return TaxesConfiguration.fromApiResponse(data.configuration.values);
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

    const response = await fetch(`${API_URL}/configurations/${this.configId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update configuration');
    }

    const data = await response.json();
    return TaxesConfiguration.fromApiResponse(data.configuration.values);
  }
}

export const taxesService = new TaxesService();
