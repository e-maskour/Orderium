import { renderHeaderTemplate } from '../document.template';

const base = {
  companyName: 'Acme SARL',
  companyLines: ['Casablanca'],
  documentLabel: 'Facture',
  documentNumber: 'F-001',
  date: '10/11/2026',
};

describe('renderHeaderTemplate logo', () => {
  it('renders an inline logo next to the company name', () => {
    const html = renderHeaderTemplate({
      ...base,
      logoSrc: 'data:image/webp;base64,AAAA',
    });
    expect(html).toContain(
      '<img class="hdr-logo" src="data:image/webp;base64,AAAA" alt="">',
    );
  });

  it('omits the logo when none is configured', () => {
    expect(renderHeaderTemplate(base)).not.toContain('<img');
  });

  it('ignores non-inline sources Chromium would have to fetch', () => {
    const html = renderHeaderTemplate({
      ...base,
      logoSrc: 'https://cdn.example.com/logo.png',
    });
    expect(html).not.toContain('<img');
  });

  it('cannot break out of the src attribute', () => {
    const html = renderHeaderTemplate({
      ...base,
      logoSrc: 'data:image/png;base64,AA" onerror="x',
    });
    expect(html).toContain(
      'src="data:image/png;base64,AA&quot; onerror=&quot;x"',
    );
  });
});
