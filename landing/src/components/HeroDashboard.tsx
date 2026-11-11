import type { CSSProperties } from 'react';
import type { Dictionary } from '@/i18n/dictionaries/fr';

const fmt = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/* 12 months of sales, normalised 0..1 — drawn as an area chart */
const SERIES = [0.38, 0.42, 0.4, 0.5, 0.47, 0.58, 0.55, 0.63, 0.6, 0.72, 0.78, 0.92];

function chartPaths(w: number, h: number) {
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - v * h * 0.9 - 4] as const);
  // smooth curve (Catmull-Rom → Bézier)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return { line: d, area: `${d} L${w},${h} L0,${h} Z`, last: pts[pts.length - 1] };
}

const NAV_ICONS = [
  'M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z',
  'M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM5.2 4H2V2h4.8l.8 4H21l-2.4 8.4a2 2 0 0 1-1.9 1.6H8.6a2 2 0 0 1-2-1.6L5.2 4Z',
  'M20 7h-4V5l-2-2h-4L8 5v2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2ZM10 5h4v2h-4V5Z',
  'M12 2 3 6.5v11L12 22l9-4.5v-11L12 2Zm0 2.2 6.3 3.1L12 10.4 5.7 7.3 12 4.2Z',
  'M4 4h16v4H4V4Zm0 6h16v10H4V10Zm3 3v2h4v-2H7Z',
  'M3 6h11v9H3V6Zm11 3h4l3 3v3h-7V9ZM6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  'M5 21V10h3v11H5Zm5.5 0V3h3v18h-3ZM16 21v-7h3v7h-3Z',
];

/**
 * A realistic Marnova back-office screen used as the hero visual.
 * Decorative (aria-hidden): the same information exists as real text on the page.
 */
export function HeroDashboard({ t, cities }: { t: Dictionary['dash']; cities: string[] }) {
  const W = 560;
  const H = 150;
  const chart = chartPaths(W, H);

  return (
    <div className="dash-wrap" aria-hidden="true">
      <div className="dash-glow" />
      <div className="dash" data-dash>
        {/* window chrome */}
        <div className="dash__chrome">
          <span className="dash__dots"><i /><i /><i /></span>
          <span className="dash__url">marnova</span>
        </div>

        <div className="dash__body">
          {/* sidebar */}
          <aside className="dash__side">
            <div className="dash__brand"><img src="/logo-icon.svg" alt="" width={22} height={22} /><b>Marnova</b></div>
            <ul>
              {t.nav.map((label, i) => (
                <li key={label} className={i === 0 ? 'is-on' : undefined}>
                  <svg viewBox="0 0 24 24"><path d={NAV_ICONS[i]} /></svg>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* main */}
          <div className="dash__main">
            <div className="dash__top">
              <div>
                <p className="dash__hello">{t.greeting}</p>
                <p className="dash__period">{t.period}</p>
              </div>
              <div className="dash__search">
                <svg viewBox="0 0 24 24"><path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2Zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12Z" /></svg>
                <span>{t.search}</span>
              </div>
              <span className="dash__avatar">Y</span>
            </div>

            <div className="dash__kpis">
              {t.kpis.map((k, i) => (
                <div className="kpi" key={k.l} style={{ '--k': i } as CSSProperties}>
                  <small>{k.l}</small>
                  <b className="num">
                    <span data-count={k.v}>{fmt(k.v)}</span>
                    {k.suffix && <em>{k.suffix}</em>}
                  </b>
                  <span className={`kpi__delta${i === 0 ? ' is-up' : ''}`}>{k.d}</span>
                </div>
              ))}
            </div>

            <div className="dash__grid">
              <div className="card card--chart">
                <div className="card__head">
                  <p>{t.chart}</p>
                  <span className="card__pill num">2026</span>
                </div>
                <svg className="dchart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#2F6BFF" stopOpacity=".32" />
                      <stop offset="1" stopColor="#2F6BFF" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="dashLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="#1D4ED8" />
                      <stop offset="1" stopColor="#22D3EE" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((g) => (
                    <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="dchart__grid" />
                  ))}
                  <path d={chart.area} fill="url(#dashArea)" className="dchart__area" />
                  <path d={chart.line} fill="none" stroke="url(#dashLine)" strokeWidth="2.5" className="dchart__line" pathLength={1} />
                  <circle cx={chart.last[0]} cy={chart.last[1]} r="5" className="dchart__dot" />
                </svg>
                <div className="dchart__months">
                  {t.months.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>

              <div className="card card--stock">
                <div className="card__head"><p>{t.stock}</p></div>
                <ul className="mini-bars">
                  {cities.map((c, i) => (
                    <li key={c}>
                      <span>{c}</span>
                      <i style={{ '--v': ['82%', '54%', '28%'][i], '--k': i } as CSSProperties} className={i === 2 ? 'low' : undefined} />
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card card--table">
                <div className="card__head"><p>{t.recent}</p></div>
                <table>
                  <thead>
                    <tr>{t.cols.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r, i) => (
                      <tr key={r.ref} style={{ '--k': i } as CSSProperties}>
                        <td className="num">{r.ref}</td>
                        <td>{r.client}</td>
                        <td><span className="chip" data-tone={r.tone || undefined}>{r.status}</span></td>
                        <td className="num">{r.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* floating live notifications */}
      <div className="float float--1">
        <span className="float__ico float__ico--ok"><svg viewBox="0 0 24 24"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" /></svg></span>
        <span><b>{t.float1.t}</b><small>{t.float1.d}</small></span>
      </div>
      <div className="float float--2">
        <span className="float__ico float__ico--warn"><svg viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2Zm1 16h-2v-2h2v2Zm0-4h-2v-4h2v4Z" /></svg></span>
        <span><b>{t.float2.t}</b><small>{t.float2.d}</small></span>
      </div>
      <div className="float float--3">
        <span className="float__ico"><svg viewBox="0 0 24 24"><path d="M3 6h11v9H3V6Zm11 3h4l3 3v3h-7V9ZM6.5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /></svg></span>
        <span><b>{t.float3.t}</b><small>{t.float3.d}</small></span>
      </div>
    </div>
  );
}
