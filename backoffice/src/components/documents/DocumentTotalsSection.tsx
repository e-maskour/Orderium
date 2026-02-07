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
    <div className="max-w-md ml-auto">
      <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="space-y-3">
          {/* Subtotal HT */}
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <span className="text-sm font-medium text-slate-600">{t('subtotalHT')}</span>
            <span className="text-base font-semibold text-slate-900">{totalHT.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
          </div>

          {/* Tax breakdown by rate */}
          {displayMode === 'detailed' && Object.entries(taxByRate).length > 0 && (
            <div className="space-y-2 py-2">
              {Object.entries(taxByRate).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">TVA {rate}%</span>
                  <span className="text-sm font-medium text-slate-700">{amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Total TVA */}
          {Object.keys(taxByRate).length > 0 && (
            <div className="flex justify-between items-center py-2 border-t border-slate-200">
              <span className="text-sm font-semibold text-slate-700">{t('totalTVA')}</span>
            <span className="text-base font-semibold text-slate-800">{totalTVA.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
            </div>
          )}

          {/* Total TTC - Prominent */}
          <div className="mt-4 pt-4 border-t-2 border-slate-300">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 shadow-md">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold text-base">{t('totalTTC')}</span>
                <span className="text-white font-bold text-2xl">{totalTTC.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {language === 'ar' ? 'د.م' : 'DH'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
