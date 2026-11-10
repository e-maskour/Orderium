'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Dictionary } from '@/i18n/dictionaries/fr';

type Billing = 'monthly' | 'yearly';

const noop = () => () => {};

/**
 * Monthly / yearly switch for the pricing cards. The cards themselves are server-rendered
 * children carrying both prices; this wrapper only flips `data-billing`, and CSS shows the
 * matching one. Without JavaScript the toggle stays hidden and monthly prices show.
 */
export function Pricing({ t, children }: { t: Dictionary['pricing']['billing']; children: ReactNode }) {
  const [billing, setBilling] = useState<Billing>('monthly');
  const hydrated = useSyncExternalStore(noop, () => true, () => false);

  return (
    <div className="pricing" data-billing={billing}>
      <div className="billing" role="group" aria-label={t.label} data-ready={hydrated || undefined}>
        {(['monthly', 'yearly'] as const).map((b) => (
          <button
            key={b}
            type="button"
            className="billing__opt"
            aria-pressed={billing === b}
            onClick={() => setBilling(b)}
          >
            {b === 'monthly' ? t.monthly : t.yearly}
            {b === 'yearly' && <span className="billing__save">{t.save}</span>}
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
