import type { KeyDefinition, KeyRow } from '../../../types/keyboard.types';

// ─── Symbols / Special Characters Layout ─────────────────────────────────────

const rows: KeyRow[] = [
  {
    keys: [
      { value: '1' },
      { value: '2' },
      { value: '3' },
      { value: '4' },
      { value: '5' },
      { value: '6' },
      { value: '7' },
      { value: '8' },
      { value: '9' },
      { value: '0' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '@' },
      { value: '#' },
      { value: '$' },
      { value: '%' },
      { value: '&' },
      { value: '*' },
      { value: '-' },
      { value: '+' },
      { value: '=' },
      { value: '/' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '!' },
      { value: '"' },
      { value: "'" },
      { value: ':' },
      { value: ';' },
      { value: '(' },
      { value: ')' },
      { value: '[' },
      { value: ']' },
      { value: '?' },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: '~' },
      { value: '^' },
      { value: '_' },
      { value: '|' },
      { value: '<' },
      { value: '>' },
      { value: '{' },
      { value: '}' },
      { value: '\\' },
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
      { value: '.', widthMultiplier: 1 },
      { value: ',', widthMultiplier: 1 },
      {
        value: 'space',
        label: 'Space',
        isAction: true,
        action: 'space',
        widthMultiplier: 3,
      },
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

export const symbolsLayout = { rows };
