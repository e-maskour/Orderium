import type { KeyDefinition, KeyRow } from '../../../types/keyboard.types';

// ─── English QWERTY Layout ────────────────────────────────────────────────────

const rows: KeyRow[] = [
  {
    keys: [
      { value: 'q', upper: 'Q' },
      { value: 'w', upper: 'W' },
      { value: 'e', upper: 'E', longPressOptions: ['é', 'è', 'ê', 'ë'] },
      { value: 'r', upper: 'R' },
      { value: 't', upper: 'T' },
      { value: 'y', upper: 'Y' },
      { value: 'u', upper: 'U', longPressOptions: ['ü', 'û', 'ù'] },
      { value: 'i', upper: 'I', longPressOptions: ['ï', 'î'] },
      { value: 'o', upper: 'O', longPressOptions: ['ô', 'ö', 'ø'] },
      { value: 'p', upper: 'P' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: 'a', upper: 'A', longPressOptions: ['à', 'â', 'ä', 'æ'] },
      { value: 's', upper: 'S' },
      { value: 'd', upper: 'D' },
      { value: 'f', upper: 'F' },
      { value: 'g', upper: 'G' },
      { value: 'h', upper: 'H' },
      { value: 'j', upper: 'J' },
      { value: 'k', upper: 'K' },
      { value: 'l', upper: 'L' },
      { value: "'", upper: '"' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      {
        value: 'shift',
        label: '⇧',
        isAction: true,
        action: 'shift',
        widthMultiplier: 1.5,
      },
      { value: 'z', upper: 'Z' },
      { value: 'x', upper: 'X' },
      { value: 'c', upper: 'C', longPressOptions: ['ç'] },
      { value: 'v', upper: 'V' },
      { value: 'b', upper: 'B' },
      { value: 'n', upper: 'N' },
      { value: 'm', upper: 'M' },
      { value: ',', upper: '<' },
      { value: '.', upper: '>' },
      {
        value: 'backspace',
        label: '⌫',
        isAction: true,
        action: 'backspace',
        widthMultiplier: 1.5,
      },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      {
        value: 'close',
        label: '▼',
        isAction: true,
        action: 'close',
        widthMultiplier: 1.2,
      },
      {
        value: 'tab',
        label: 'Tab ↹',
        isAction: true,
        action: 'tab',
        widthMultiplier: 1.2,
      },
      {
        value: 'space',
        label: 'Space',
        isAction: true,
        action: 'space',
        widthMultiplier: 4,
      },
      { value: '@', upper: '@' },
      { value: '-', upper: '_' },
      {
        value: 'clear',
        label: 'Clear',
        isAction: true,
        action: 'clear',
        widthMultiplier: 1.2,
      },
      {
        value: 'enter',
        label: 'Enter ↵',
        isAction: true,
        action: 'enter',
        widthMultiplier: 1.8,
      },
    ] satisfies KeyDefinition[],
  },
];

export const englishLayout = { rows };
