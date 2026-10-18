import { Check, Hourglass, Receipt, Wallet } from 'lucide-react';
import { formatAmount } from '@orderium/ui';
import { useLanguage } from '../../context/LanguageContext';

interface OrderMoneySummaryProps {
  total: number;
  paid: number;
  remaining: number;
  /** Draft orders aren't expected to be paid yet, so "Reste" stays neutral. */
  neutral?: boolean;
}

/** Total / Payé / Reste à payer, shown once, with a progress bar underneath. */
export function OrderMoneySummary({ total, paid, remaining, neutral }: OrderMoneySummaryProps) {
  const { t } = useLanguage();
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  const dueTone = neutral ? 'info' : remaining > 0 ? 'warn' : 'ok';
  const currency = t('currency');

  return (
    <section className="od-money" aria-label={t('payments')}>
      <div className="od-tile">
        <span className="od-tile__label">
          <Receipt aria-hidden="true" />
          {t('total')}
        </span>
        <span className="od-tile__amount">
          {formatAmount(total, 2)}
          <small>{currency}</small>
        </span>
      </div>
      <div className="od-tile">
        <span className="od-tile__label">
          <Wallet aria-hidden="true" />
          {t('odPaid')}
        </span>
        <span className="od-tile__amount">
          {formatAmount(paid, 2)}
          <small>{currency}</small>
        </span>
      </div>
      <div className="od-tile od-tile--due" data-tone={dueTone}>
        <span className="od-tile__label">
          <Hourglass aria-hidden="true" />
          {t('odDue')}
        </span>
        <span className="od-tile__amount">
          {formatAmount(remaining, 2)}
          <small>{currency}</small>
        </span>
        <span className="od-tile__hint">
          {remaining <= 0 ? (
            <>
              <Check aria-hidden="true" />
              {t('odAllPaid')}
            </>
          ) : paid > 0 ? (
            t('odToCollect')
          ) : (
            t('odNothingPaid')
          )}
        </span>
      </div>
      <div className="od-money__bar">
        <div
          className="od-money__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="od-money__pct">{t('odPaidPercent').replace('{pct}', String(pct))}</span>
      </div>
    </section>
  );
}
