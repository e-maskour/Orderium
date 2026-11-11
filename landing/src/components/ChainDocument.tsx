import type { CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/dictionaries/fr';

const QTY = [24, 40, 60, 12];
const TOTALS = ['3 960,00', '2 800,00', '1 920,00', '1 720,00'];

const ICONS = [
  <path key="s" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />,
  <path key="c" d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4H2V2h4.8l.8 4H21l-2.4 8.4a2 2 0 0 1-1.9 1.6H8.6a2 2 0 0 1-2-1.6L5.2 4Z" />,
  <path key="b" d="M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 6.3 3.1L12 10.4 5.7 7.3 12 4.2ZM5 9l6 3v7.6l-6-3V9Zm8 10.6V12l6-3v7.6l-6 3Z" />,
  <path key="k" d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" />,
];

/**
 * The business document that evolves as the visitor scrolls the chain section.
 * Server-rendered on the paid invoice (stage 3), so without JavaScript it is complete;
 * the Motion component then drives `data-stage` from the scroll position.
 */
export function ChainDocument({ t }: { t: Dictionary['doc'] }) {
  return (
    <div className="cdoc" data-stage-host data-stage="3" aria-hidden="true">
      <div className="cdoc__sheet">
        <div className="cdoc__head">
          <div className="cdoc__stack">
            {t.stages.map((s, i) => (
              <div className="cdoc__title" data-s={i} key={s.ref}>
                <p className="cdoc__type">{s.type}</p>
                <p className="cdoc__ref">{s.ref}</p>
              </div>
            ))}
          </div>
          <div className="cdoc__stack cdoc__stack--end">
            {t.stages.map((s, i) => (
              <span className="chip" data-tone={s.tone || undefined} data-s={i} key={s.chip}>
                {s.chip}
              </span>
            ))}
          </div>
        </div>

        <div className="cdoc__parties">
          <div>
            <p className="muted">{t.client}</p>
            <p className="strong">Épicerie Al Amal</p>
            <p className="muted">ICE 001524873000062</p>
          </div>
          <div className="cdoc__date">
            <p className="muted">{t.date}</p>
            <p className="strong num">10/11/2026</p>
          </div>
        </div>

        <table className="cdoc__lines">
          <thead>
            <tr>
              <th>{t.item}</th>
              <th className="num">{t.qty}</th>
              <th className="num">{t.total}</th>
            </tr>
          </thead>
          <tbody>
            {t.lines.map((line, i) => (
              <tr key={line} style={{ '--k': i } as CSSProperties}>
                <td>
                  <i className="cdoc__check" />
                  {line}
                </td>
                <td className="num">{QTY[i]}</td>
                <td className="num">{TOTALS[i]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="cdoc__totals">
          <div>
            <span>{t.ht}</span>
            <span className="num">10 400,00</span>
          </div>
          <div>
            <span>{t.tva}</span>
            <span className="num">2 080,00</span>
          </div>
          <div className="cdoc__ttc">
            <span>{t.ttc}</span>
            <span className="num">
              12 480,00 <small>{t.currency}</small>
            </span>
          </div>
        </div>

        <div className="cdoc__paybar">
          <i />
        </div>
        <div className="cdoc__stamp">{t.paid}</div>
      </div>

      {t.toasts.map((toast, i) => (
        <div className={`toast toast--${i}`} data-s={i} key={toast.t}>
          <span className={`toast__ico${i === 3 ? ' toast__ico--ok' : ''}`}>
            <svg viewBox="0 0 24 24">{ICONS[i]}</svg>
          </span>
          <span>
            <b>{toast.t}</b>
            <small>{toast.d}</small>
          </span>
        </div>
      ))}
    </div>
  );
}
