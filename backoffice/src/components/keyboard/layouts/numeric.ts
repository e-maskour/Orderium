import type { KeyDefinition, KeyRow } from '../../../types/keyboard.types';

// ─── Numeric Keypad Layout ────────────────────────────────────────────────────
// Optimized for price / quantity entry

const rows: KeyRow[] = [
  {
    keys: [
      { value: '7', widthMultiplier: 1 },
      { value: '8', widthMultiplier: 1 },
      { value: '9', widthMultiplier: 1 },
      {
        value: 'backspace',
        label: '⌫',
        isAction: true,
        action: 'backspace',
        widthMultiplier: 1,
      },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '4', widthMultiplier: 1 },
      { value: '5', widthMultiplier: 1 },
      { value: '6', widthMultiplier: 1 },
      {
        value: 'clear',
        label: 'C',
        isAction: true,
        action: 'clear',
        widthMultiplier: 1,
      },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '1', widthMultiplier: 1 },
      { value: '2', widthMultiplier: 1 },
      { value: '3', widthMultiplier: 1 },
      {
        value: 'enter',
        label: '↵',
        isAction: true,
        action: 'enter',
        widthMultiplier: 1,
      },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '+', widthMultiplier: 1 },
      { value: '0', widthMultiplier: 1 },
      { value: '.', widthMultiplier: 1 },
      {
        value: 'close',
        label: '▼',
        isAction: true,
        action: 'close',
        widthMultiplier: 1,
      },
    ] satisfies KeyDefinition[],
  },
];

export const numericLayout = { rows, compact: true };
