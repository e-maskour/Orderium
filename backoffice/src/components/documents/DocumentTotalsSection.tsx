import { useDocumentCalculation } from '../../modules/documents/hooks';
import { DocumentItem } from '../../modules/documents/types';
import { useLanguage } from '../../context/LanguageContext';

interface DocumentTotalsSectionProps {
  items: DocumentItem[];
  displayMode?: 'simple' | 'detailed';
}

export function DocumentTotalsSection({
  items,
  displayMode = 'detailed'
}: DocumentTotalsSectionProps) {
  const { t, language } = useLanguage();
  const { totalHT, totalTVA, totalTTC, taxByRate } = useDocumentCalculation(items);

  return (
    <div style={{ maxWidth: '28rem', marginLeft: 'auto' }}>
      <div style={{
        borderRadius: '1rem',
        overflow: 'hidden',
        border: '1.5px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      }}>
        {/* Totals header */}
        <div style={{
          padding: '0.75rem 1.25rem',
          background: 'linear-gradient(to right, #f8fafc, #f1f5f9)',
          borderBottom: '1.5px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <div style={{ width: '0.25rem', height: '1.25rem', background: 'linear-gradient(to bottom, #235ae4, #1a47b8)', borderRadius: '2px' }} />
          <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('totalTTC')}
          </span>
        </div>

        <div style={{ background: 'linear-gradient(to bottom, #f8fafc, #ffffff)', padding: '1rem 1.25rem' }}>
          {/* Subtotal HT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e8edf2' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{t('subtotalHT')}</span>
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e293b' }}>
              {totalHT.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
            </span>
          </div>

          {/* Tax breakdown */}
          {displayMode === 'detailed' && Object.entries(taxByRate).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid #e8edf2' }}>
              {Object.entries(taxByRate).map(([rate, amount]) => (
                <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.25rem', height: '1.25rem', background: '#fffbeb', borderRadius: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: '#92400e' }}>%</span>
                    <span style={{ fontSize: '0.875rem', color: '#475569' }}>TVA {rate}%</span>
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                    {amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Total TVA */}
          {Object.keys(taxByRate).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#475569' }}>{t('totalTVA')}</span>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#334155' }}>
                {totalTVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}
              </span>
            </div>
          )}
        </div>

        {/* Total TTC - Prominent */}
        <div style={{
          background: 'linear-gradient(135deg, #235ae4 0%, #1a47b8 100%)',
          padding: '1rem 1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 700, fontSize: '1rem' }}>{t('totalTTC')}</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.375rem', display: 'block', letterSpacing: '-0.02em' }}>
              {totalTTC.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem', fontWeight: 600 }}>
              {language === 'ar' ? 'د.م' : 'DH'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
