import { DataSource } from 'typeorm';
import { Configuration } from '../../modules/configurations/entities/configuration.entity';

export async function seedConfigurations(dataSource: DataSource) {
  const configRepository = dataSource.getRepository(Configuration);

  const configurations = [
    {
      entity: 'taxes',
      values: {
        defaultRate: 20,
        rates: [
          { name: 'Standard', rate: 20, isDefault: true },
          { name: 'Reduced', rate: 10, isDefault: false },
          { name: 'Zero', rate: 0, isDefault: false },
        ],
      },
    },
    {
      entity: 'currencies',
      values: {
        default: 'MAD',
        currencies: [
          { code: 'MAD', name: 'Moroccan Dirham', symbol: 'DH', isDefault: true },
          { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
          { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false },
        ],
      },
    },
    {
      entity: 'payment_terms',
      values: {
        default: 'immediate',
        terms: [
          { key: 'immediate', label: 'Immediate', days: 0, isDefault: true },
          { key: 'net_15', label: 'Net 15', days: 15, isDefault: false },
          { key: 'net_30', label: 'Net 30', days: 30, isDefault: false },
          { key: 'net_60', label: 'Net 60', days: 60, isDefault: false },
        ],
      },
    },
    {
      entity: 'sequences',
      values: {
        sequences: [
          {
            id: 'seq_invoice_sale_001',
            name: 'Factures de vente',
            entityType: 'invoice_sale',
            prefix: 'INV-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'seq_invoice_purchase_001',
            name: 'Factures d\\\'achat',
            entityType: 'invoice_purchase',
            prefix: 'PINV-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'seq_quote_001',
            name: 'Devis',
            entityType: 'quote',
            prefix: 'QTE-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'seq_delivery_note_001',
            name: 'Bons de livraison',
            entityType: 'delivery_note',
            prefix: 'BL-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'seq_purchase_order_001',
            name: 'Bons d\\\'achat',
            entityType: 'purchase_order',
            prefix: 'BA-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'seq_payment_001',
            name: 'Paiements',
            entityType: 'payment',
            prefix: 'PAY-',
            suffix: '',
            nextNumber: 1,
            numberLength: 4,
            resetPeriod: 'yearly',
            dateFormat: 'YYYY',
            isActive: true,
            yearInPrefix: false,
            monthInPrefix: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    },
  ];

  for (const config of configurations) {
    const existing = await configRepository.findOne({
      where: { entity: config.entity },
    });

    if (!existing) {
      await configRepository.save(configRepository.create(config));
      console.log(`✓ Created configuration: ${config.entity}`);
    } else {
      console.log(`- Configuration already exists: ${config.entity}`);
    }
  }
}
