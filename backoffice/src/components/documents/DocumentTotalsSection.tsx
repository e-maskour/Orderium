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
        background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Subtotal HT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#475569' }}>{t('subtotalHT')}</span>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>{totalHT.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
          </div>

          {/* Tax breakdown by rate */}
          {displayMode === 'detailed' && Object.entries(taxByRate).length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem 0' }}>
              {Object.entries(taxByRate).map(([rate, amount]) => (
                <div key={rate} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem', color: '#475569' }}>TVA {rate}%</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#334155' }}>{amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total TVA */}
          {Object.keys(taxByRate).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{t('totalTVA')}</span>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>{totalTVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
            </div>
          )}

          {/* Total TTC - Prominent */}
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #cbd5e1' }}>
            <div style={{
              background: 'linear-gradient(to right, #f59e0b, #d97706)',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1rem' }}>{t('totalTTC')}</span>
                <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '1.5rem' }}>{totalTTC.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
