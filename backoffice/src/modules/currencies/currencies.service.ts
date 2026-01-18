import { Currency, CurrenciesConfiguration } from './currencies.model';
import { CreateCurrencyDTO, UpdateCurrencyDTO } from './currencies.interface';

const API_URL = '/api';

export class CurrenciesService {
  private configId: number | null = null;

  async getConfiguration(): Promise<CurrenciesConfiguration> {
    const response = await fetch(`${API_URL}/configurations/entity/currencies`);
    if (!response.ok) throw new Error('Failed to fetch currencies configuration');
    const data = await response.json();
    
    this.configId = data.configuration.id;
    return CurrenciesConfiguration.fromApiResponse(data.configuration.values);
  }

  async getAllCurrencies(): Promise<Currency[]> {
    const config = await this.getConfiguration();
    return config.currencies;
  }

  async createCurrency(data: CreateCurrencyDTO): Promise<CurrenciesConfiguration> {
    const config = await this.getConfiguration();
    const newCurrencies = [...config.currencies.map(c => c.toJSON())];
    
    // If setting as default, remove default from others
    if (data.isDefault) {
      newCurrencies.forEach(c => c.isDefault = false);
    }
    
    newCurrencies.push({
      code: data.code.toUpperCase(),
      name: data.name,
      symbol: data.symbol,
      isDefault: data.isDefault || false,
    });

    const newDefault = newCurrencies.find(c => c.isDefault)?.code || config.default;

    return this.updateConfiguration({
      currencies: newCurrencies,
      default: newDefault,
    });
  }

  async updateCurrency(index: number, data: UpdateCurrencyDTO): Promise<CurrenciesConfiguration> {
    const config = await this.getConfiguration();
    const newCurrencies = config.currencies.map(c => c.toJSON());
    
    if (index < 0 || index >= newCurrencies.length) {
      throw new Error('Invalid currency index');
    }

    // If setting as default, remove default from others
    if (data.isDefault) {
      newCurrencies.forEach(c => c.isDefault = false);
    }

    newCurrencies[index] = {
      ...newCurrencies[index],
      ...data,
      code: data.code ? data.code.toUpperCase() : newCurrencies[index].code,
    };

    const newDefault = newCurrencies.find(c => c.isDefault)?.code || config.default;

    return this.updateConfiguration({
      currencies: newCurrencies,
      default: newDefault,
    });
  }

  async deleteCurrency(index: number): Promise<CurrenciesConfiguration> {
    const config = await this.getConfiguration();
    const newCurrencies = config.currencies.map(c => c.toJSON()).filter((_, i) => i !== index);
    
    const newDefault = newCurrencies.find(c => c.isDefault)?.code || (newCurrencies[0]?.code || '');

    return this.updateConfiguration({
      currencies: newCurrencies,
      default: newDefault,
    });
  }

  private async updateConfiguration(values: any): Promise<CurrenciesConfiguration> {
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
    return CurrenciesConfiguration.fromApiResponse(data.configuration.values);
  }
}

export const currenciesService = new CurrenciesService();
