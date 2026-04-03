import { useState } from 'react';
import { X, Clock } from 'lucide-react';

interface Props {
  daysRemaining: number;
  trialEndsAt: string | null;
}

export function TrialBanner({ daysRemaining, trialEndsAt }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = daysRemaining <= 3;
  const isWarning = daysRemaining <= 7;

  const bgClass = isUrgent ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-blue-600';

  const endsText = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const message =
    daysRemaining === 0
      ? 'Your trial ends today! Contact us to activate your subscription.'
      : `Your trial ends in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}${endsText ? ` (${endsText})` : ''}. Contact us to upgrade.`;

  return (
    <div
      className={`relative flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white ${bgClass}`}
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>{message}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-white/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
