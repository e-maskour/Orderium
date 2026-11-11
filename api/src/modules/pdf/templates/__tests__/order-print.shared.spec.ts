import {
  amountToFrenchWords,
  code128Values,
  esc,
  renderCode128Svg,
  resolvePaymentState,
} from '../order-print.shared';

describe('amountToFrenchWords', () => {
  it.each([
    [0, 'Zéro dirham'],
    [1, 'Un dirham'],
    [21, 'Vingt-et-un dirhams'],
    [71, 'Soixante-et-onze dirhams'],
    [80, 'Quatre-vingts dirhams'],
    [99, 'Quatre-vingt-dix-neuf dirhams'],
    [200, 'Deux cents dirhams'],
    [1630, 'Mille six cent trente dirhams'],
    [80000, 'Quatre-vingt mille dirhams'],
    [200000, 'Deux cent mille dirhams'],
    [2000000, 'Deux millions de dirhams'],
    [1250000, 'Un million deux cent cinquante mille dirhams'],
    [12.5, 'Douze dirhams et cinquante centimes'],
    [1.01, 'Un dirham et un centime'],
  ])('%p → %p', (amount, expected) => {
    expect(amountToFrenchWords(amount)).toBe(expected);
  });
});

describe('code128Values', () => {
  it('encodes set B with a mod-103 checksum', () => {
    // Start B (104) + "AB" (33, 34): (104 + 33*1 + 34*2) % 103 = 102
    expect(code128Values('AB')).toEqual([104, 33, 34, 102, 106]);
  });

  it('rejects text set B cannot encode', () => {
    expect(code128Values('')).toBeNull();
    expect(code128Values('CMD-é')).toBeNull();
    expect(renderCode128Svg('CMD-é', 40)).toBe('');
  });

  it('renders an svg for order numbers', () => {
    expect(renderCode128Svg('CMD-2026-08-0003', 40)).toMatch(/^<svg .*<rect/);
  });
});

describe('resolvePaymentState', () => {
  it('derives the state from total and paid amount', () => {
    expect(resolvePaymentState(1630, 0)).toBe('non_paye');
    expect(resolvePaymentState(1630, 500)).toBe('partiel');
    expect(resolvePaymentState(1630, 1630)).toBe('paye');
    expect(resolvePaymentState(0, 0)).toBe('paye');
  });
});

describe('esc', () => {
  it('escapes html', () => {
    expect(esc('<b>"A&B"</b>')).toBe('&lt;b&gt;&quot;A&amp;B&quot;&lt;/b&gt;');
    expect(esc(undefined)).toBe('');
  });
});
