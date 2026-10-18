import type { ReactNode } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Home,
  Pencil,
  Truck,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import type { TranslationKey } from '../../lib/i18n';
import { getStageStep, getStageTone } from './orderStage';
import type { OrderStage } from './orderStage';

const STAGE_ICON: Record<OrderStage, LucideIcon> = {
  draft: Pencil,
  ready: ClipboardCheck,
  delivering: Truck,
  deliveredUnpaid: Wallet,
  done: CheckCircle2,
  invoiced: FileText,
  cancelled: XCircle,
};

const STAGE_TITLE: Record<OrderStage, TranslationKey> = {
  draft: 'odDraftTitle',
  ready: 'odReadyTitle',
  delivering: 'odDeliveringTitle',
  deliveredUnpaid: 'odDeliveredUnpaidTitle',
  done: 'odDoneTitle',
  invoiced: 'odInvoicedTitle',
  cancelled: 'odCancelledTitle',
};

const STEPS: { key: TranslationKey; icon: LucideIcon }[] = [
  { key: 'odStepDraft', icon: Pencil },
  { key: 'odStepValidated', icon: ClipboardCheck },
  { key: 'odStepDelivering', icon: Truck },
  { key: 'odStepDelivered', icon: Home },
];

interface OrderStatusBannerProps {
  stage: OrderStage;
  remainingAmount: number;
  /** Already formatted, e.g. "209,00 DH". */
  remainingLabel: string;
  /** The single "next thing to do" button, rendered beside the sentence and in the phone's sticky bar. */
  action?: ReactNode;
}

export function OrderStatusBanner({
  stage,
  remainingAmount,
  remainingLabel,
  action,
}: OrderStatusBannerProps) {
  const { t } = useLanguage();
  const tone = getStageTone(stage, remainingAmount);
  const step = getStageStep(stage);
  const Icon = STAGE_ICON[stage];

  let text: string;
  switch (stage) {
    case 'draft':
      text = t('odDraftText');
      break;
    case 'ready':
    case 'delivering':
      text =
        remainingAmount > 0
          ? t('odDueText').replace('{amount}', remainingLabel)
          : t('odPaidReadyText');
      break;
    case 'deliveredUnpaid':
      text = t('odDueText').replace('{amount}', remainingLabel);
      break;
    case 'done':
      text = t('odDoneText');
      break;
    case 'invoiced':
      text = t('odInvoicedText');
      break;
    default:
      text = t('odCancelledText');
  }

  return (
    <>
      <section className="od-banner" data-tone={tone} aria-live="polite">
        <div className="od-banner__top">
          <span className="od-banner__icon" aria-hidden="true">
            <Icon />
          </span>
          <div className="od-banner__text">
            <h2>{t(STAGE_TITLE[stage])}</h2>
            <p>{text}</p>
          </div>
          {action && <div className="od-banner__action">{action}</div>}
        </div>

        {step >= 0 && (
          <ol className="od-steps">
            {STEPS.map(({ key, icon: StepIcon }, i) => {
              const state = i < step ? 'done' : i === step ? 'now' : 'todo';
              return (
                <li
                  key={key}
                  className={`od-step od-step--${state}`}
                  aria-current={state === 'now' ? 'step' : undefined}
                >
                  <span className="od-step__dot" aria-hidden="true">
                    {state === 'done' ? <Check /> : <StepIcon />}
                  </span>
                  {t(key)}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {action && <div className="od-sticky-action">{action}</div>}
    </>
  );
}
