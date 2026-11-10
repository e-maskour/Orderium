import {
  DeliveryNoteTemplateData,
  renderDeliveryNoteTemplate,
} from '../delivery-note.template';
import { getPaymentStatusView } from '../order-print.shared';

const base: DeliveryNoteTemplateData = {
  lang: 'fr',
  title: 'BON DE LIVRAISON',
  documentNumber: 'CMD-001',
  date: '10/11/2026',
  company: { name: 'Acme', logoSrc: 'data:image/webp;base64,AAAA' },
  client: { name: 'Client Test', phone: '0600000000' },
  status: getPaymentStatusView('non_paye', 'fr'),
  items: [
    {
      name: 'Produit A',
      qty: '2',
      price: '10,00',
      total: '20,00',
      sub: '',
      extras: '',
    },
  ],
  linesLabel: '1 article',
  unitsLabel: '2 unités au total',
  breakdown: [{ label: 'Sous-total HT', value: '20,00 DH' }],
  grandTotal: '20,00',
  currency: 'DH',
  barcodeSvg: '',
};

describe('renderDeliveryNoteTemplate', () => {
  it('keeps the delivery-note defaults', () => {
    const html = renderDeliveryNoteTemplate(base);
    expect(html).toContain('N° DE COMMANDE');
    expect(html).toContain('LIVRER À');
    expect(html).toContain('Repère / indication');
    expect(html).toContain('TOTAL À PAYER');
    expect(html).toContain('NON PAYÉ');
    expect(html).toContain('<img class="logo"');
  });

  it('prints an invoice with client, ICE, due date and notes', () => {
    const html = renderDeliveryNoteTemplate({
      ...base,
      title: 'FACTURE',
      numberLabel: 'N° FACTURE',
      partyLabel: 'CLIENT',
      partyIce: '001234567000089',
      extraDates: [{ label: 'ÉCHÉANCE', value: '10/12/2026' }],
      totalLabel: 'NET À PAYER',
      notes: 'Paiement par virement',
    });
    expect(html).toContain('N° FACTURE');
    expect(html).toContain('CLIENT');
    expect(html).toContain('001234567000089');
    expect(html).toContain('10/12/2026');
    expect(html).toContain('NET À PAYER');
    expect(html).toContain('Paiement par virement');
    expect(html).not.toContain('LIVRER À');
    expect(html).not.toContain('Repère / indication');
  });

  it('drops the payment badge when there is no status (quotes)', () => {
    const html = renderDeliveryNoteTemplate({
      ...base,
      partyLabel: 'CLIENT',
      status: undefined,
    });
    expect(html).toContain('class="meta solo"');
    expect(html).not.toContain('class="pay"');
  });

  it('prints a demande de prix with quantities only', () => {
    const html = renderDeliveryNoteTemplate({
      ...base,
      partyLabel: 'FOURNISSEUR',
      status: undefined,
      hidePrices: true,
    });
    expect(html).toContain('QUANTITÉ TOTALE DEMANDÉE');
    expect(html).not.toContain('10,00');
    expect(html).not.toContain('Sous-total HT');
    expect(html).not.toContain('>PRIX<');
  });

  it('escapes notes', () => {
    const html = renderDeliveryNoteTemplate({
      ...base,
      notes: '<script>x</script>',
    });
    expect(html).not.toContain('<script>x');
  });
});
