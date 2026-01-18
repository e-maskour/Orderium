import { PaymentTerm, PaymentTermsConfiguration } from './payment-terms.model';
import { CreatePaymentTermDTO, UpdatePaymentTermDTO } from './payment-terms.interface';

const API_URL = '/api';

export class PaymentTermsService {
  private configId: number | null = null;

  async getConfiguration(): Promise<PaymentTermsConfiguration> {
    const response = await fetch(`${API_URL}/configurations/entity/payment_terms`);
    if (!response.ok) throw new Error('Failed to fetch payment terms configuration');
    const data = await response.json();
    
    this.configId = data.configuration.id;
    return PaymentTermsConfiguration.fromApiResponse(data.configuration.values);
  }

  async getAllTerms(): Promise<PaymentTerm[]> {
    const config = await this.getConfiguration();
    return config.terms;
  }

  async createTerm(data: CreatePaymentTermDTO): Promise<PaymentTermsConfiguration> {
    const config = await this.getConfiguration();
    const newTerms = [...config.terms.map(t => t.toJSON())];
    
    // If setting as default, remove default from others
    if (data.isDefault) {
      newTerms.forEach(t => t.isDefault = false);
    }
    
    newTerms.push({
      key: data.key.toLowerCase().replace(/\s+/g, '_'),
      label: data.label,
      days: data.days,
      isDefault: data.isDefault || false,
    });

    const newDefault = newTerms.find(t => t.isDefault)?.key || config.default;

    return this.updateConfiguration({
      terms: newTerms,
      default: newDefault,
    });
  }

  async updateTerm(index: number, data: UpdatePaymentTermDTO): Promise<PaymentTermsConfiguration> {
    const config = await this.getConfiguration();
    const newTerms = config.terms.map(t => t.toJSON());
    
    if (index < 0 || index >= newTerms.length) {
      throw new Error('Invalid payment term index');
    }

    // If setting as default, remove default from others
    if (data.isDefault) {
      newTerms.forEach(t => t.isDefault = false);
    }

    newTerms[index] = {
      ...newTerms[index],
      ...data,
      key: data.key ? data.key.toLowerCase().replace(/\s+/g, '_') : newTerms[index].key,
    };

    const newDefault = newTerms.find(t => t.isDefault)?.key || config.default;

    return this.updateConfiguration({
      terms: newTerms,
      default: newDefault,
    });
  }

  async deleteTerm(index: number): Promise<PaymentTermsConfiguration> {
    const config = await this.getConfiguration();
    const newTerms = config.terms.map(t => t.toJSON()).filter((_, i) => i !== index);
    
    const newDefault = newTerms.find(t => t.isDefault)?.key || (newTerms[0]?.key || '');

    return this.updateConfiguration({
      terms: newTerms,
      default: newDefault,
    });
  }

  private async updateConfiguration(values: any): Promise<PaymentTermsConfiguration> {
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
    return PaymentTermsConfiguration.fromApiResponse(data.configuration.values);
  }
}

export const paymentTermsService = new PaymentTermsService();
