import type { KeyDefinition, KeyRow } from '../../../types/keyboard.types';

// ─── French AZERTY Layout ─────────────────────────────────────────────────────

const lower: KeyRow[] = [
  {
    keys: [
      { value: 'à', upper: '1', longPressOptions: ['1', '@', '¹'] },
      { value: 'é', upper: '2', longPressOptions: ['2', '~', 'é', 'è', 'ê', 'ë'] },
      { value: 'è', upper: '3', longPressOptions: ['3', '#', 'è'] },
      { value: 'ê', upper: '4', longPressOptions: ['4', '{', 'ê'] },
      { value: 'ë', upper: '5', longPressOptions: ['5', '[', 'ë'] },
      { value: 'ô', upper: '6', longPressOptions: ['6', '|', 'ô'] },
      { value: 'û', upper: '7', longPressOptions: ['7', '`', 'û'] },
      { value: 'ù', upper: '8', longPressOptions: ['8', '\\', 'ù'] },
      { value: 'ç', upper: '9', longPressOptions: ['9', '^', 'ç'] },
      { value: 'â', upper: '0', longPressOptions: ['0', '@', 'â'] },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: 'a', upper: 'A', longPressOptions: ['à', 'â', 'ä', 'æ'] },
      { value: 'z', upper: 'Z' },
      { value: 'e', upper: 'E', longPressOptions: ['é', 'è', 'ê', 'ë'] },
      { value: 'r', upper: 'R' },
      { value: 't', upper: 'T' },
      { value: 'y', upper: 'Y' },
      { value: 'u', upper: 'U', longPressOptions: ['ù', 'û', 'ü'] },
      { value: 'i', upper: 'I', longPressOptions: ['ï', 'î'] },
      { value: 'o', upper: 'O', longPressOptions: ['ô', 'ö', 'œ'] },
      { value: 'p', upper: 'P' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: 'q', upper: 'Q' },
      { value: 's', upper: 'S' },
      { value: 'd', upper: 'D' },
      { value: 'f', upper: 'F' },
      { value: 'g', upper: 'G' },
      { value: 'h', upper: 'H' },
      { value: 'j', upper: 'J' },
      { value: 'k', upper: 'K' },
      { value: 'l', upper: 'L' },
      { value: 'm', upper: 'M' },
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
      { value: 'w', upper: 'W' },
      { value: 'x', upper: 'X' },
      { value: 'c', upper: 'C', longPressOptions: ['ç'] },
      { value: 'v', upper: 'V' },
      { value: 'b', upper: 'B' },
      { value: 'n', upper: 'N' },
      { value: '-', upper: '_' },
      { value: "'", upper: '"' },
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
        label: 'Espace',
        isAction: true,
        action: 'space',
        widthMultiplier: 4,
      },
      { value: '.', upper: '?' },
      { value: ',', upper: '!' },
      {
        value: 'clear',
        label: 'Eff.',
        isAction: true,
        action: 'clear',
        widthMultiplier: 1.2,
      },
      {
        value: 'enter',
        label: 'Entrée ↵',
        isAction: true,
        action: 'enter',
        widthMultiplier: 1.8,
      },
    ] satisfies KeyDefinition[],
  },
];

export const frenchLayout = { rows: lower };
