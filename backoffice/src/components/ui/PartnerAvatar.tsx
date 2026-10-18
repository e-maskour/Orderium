/**
 * PartnerAvatar — initials tile for a customer / supplier.
 *
 * The colour is derived from the name, so every partner gets its own tile and
 * the same partner keeps the same colour in every table. Initials use the
 * first and last word ("Client A" → "CA"), or the first two letters of a
 * single-word name ("IBRAHIM" → "IB").
 */
import type { CSSProperties } from 'react';

const PALETTE: [string, string][] = [
  ['#4f8ef7', '#235ae4'], // blue
  ['#a78bfa', '#7c3aed'], // violet
  ['#f472b6', '#db2777'], // pink
  ['#f87171', '#dc2626'], // red
  ['#fb923c', '#ea580c'], // orange
  ['#fbbf24', '#b45309'], // amber
  ['#4ade80', '#15803d'], // green
  ['#2dd4bf', '#0f766e'], // teal
  ['#22d3ee', '#0e7490'], // cyan
  ['#818cf8', '#4338ca'], // indigo
  ['#e879f9', '#a21caf'], // fuchsia
  ['#94a3b8', '#475569'], // slate
];

/** FNV-1a — small, stable string hash. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function partnerInitials(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = Array.from(words[0]);
  if (words.length === 1) return first.slice(0, 2).join('').toUpperCase();
  return (first[0] + Array.from(words[words.length - 1])[0]).toUpperCase();
}

function partnerColors(name: string | null | undefined): [string, string] {
  const key = (name ?? '').trim().toLowerCase();
  return key ? PALETTE[hash(key) % PALETTE.length] : PALETTE[PALETTE.length - 1];
}

const SIZES = {
  sm: { box: '1.875rem', font: '0.625rem' },
  md: { box: '2rem', font: '0.75rem' },
  lg: { box: '2.5rem', font: '0.875rem' },
};

export interface PartnerAvatarProps {
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  /** `rounded` (default) matches the table tiles; `circle` for round avatars. */
  shape?: 'rounded' | 'circle';
  style?: CSSProperties;
}

export function PartnerAvatar({ name, size = 'md', shape = 'rounded', style }: PartnerAvatarProps) {
  const [from, to] = partnerColors(name);
  const { box, font } = SIZES[size];
  return (
    <span
      aria-hidden="true"
      style={{
        width: box,
        height: box,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape === 'circle' ? '50%' : '0.5rem',
        background: `linear-gradient(135deg, ${from}, ${to})`,
        color: '#ffffff',
        fontSize: font,
        fontWeight: 700,
        letterSpacing: '0.02em',
        lineHeight: 1,
        textShadow: '0 1px 1px rgba(0, 0, 0, 0.15)',
        ...style,
      }}
    >
      {partnerInitials(name)}
    </span>
  );
}

export default PartnerAvatar;
