import { Currency, CurrenciesConfiguration } from './currencies.model';
import { CreateCurrencyDTO, UpdateCurrencyDTO } from './currencies.interface';
import { apiClient, API_ROUTES } from '../../common';

export class CurrenciesService {
  private configId: number | null = null;

  async getConfiguration(): Promise<CurrenciesConfiguration> {
    const response = await apiClient.get<any>(API_ROUTES.CONFIGURATIONS.BY_ENTITY('currencies'));
    this.configId = response.data.id;
    return CurrenciesConfiguration.fromApiResponse(response.data.values);
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
    const response = await apiClient.put<any>(API_ROUTES.CONFIGURATIONS.UPDATE(this.configId!), { values });
    return CurrenciesConfiguration.fromApiResponse(response.data.values);
  }
}

export const currenciesService = new CurrenciesService();
