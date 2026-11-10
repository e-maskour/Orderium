import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/dictionaries/fr';

/** Real captures from the demo tenant, one per stage (see /public/screens). */
const SCREENS = [
  { src: 'bo-dashboard', w: 1600, h: 1000 },
  { src: 'client-catalog', w: 720, h: 1558 },
  { src: 'delivery-orders', w: 720, h: 1558 },
] as const;

/**
 * One device frame that morphs between a laptop screen (back-office) and a phone
 * (customer and delivery portals) as the visitor scrolls the apps showcase.
 */
export function Device({ t, lang }: { t: Dictionary['apps']; lang: Locale }) {
  // Arabic pages show the apps captured in Arabic.
  const sfx = lang === 'ar' ? '.ar' : '';
  return (
    <div className="device" data-stage-host data-stage="0" aria-hidden="true">
      <div className="device__frame">
        <div className="device__bar">
          <i /><i /><i />
          <span className="device__url">
            {t.screens.map((label, i) => (
              <span data-s={i} key={label}>{label}</span>
            ))}
          </span>
        </div>
        <div className="device__notch" />
        <div className="device__screens">
          {SCREENS.map((s, i) => (
            <div className={`scr scr--img scr--${i}`} data-s={i} key={s.src}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/screens/${s.src}${sfx}.webp`} width={s.w} height={s.h} alt="" loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
