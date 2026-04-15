import type { KeyDefinition, KeyRow } from '../../../types/keyboard.types';

// ─── Arabic Keyboard Layout ───────────────────────────────────────────────────
// Standard Arabic keyboard (Windows Arabic 101 layout mapping)

const rows: KeyRow[] = [
  {
    keys: [
      { value: 'ض', longPressOptions: ['ضّ'] },
      { value: 'ص', longPressOptions: ['صّ'] },
      { value: 'ث', longPressOptions: ['ثّ'] },
      { value: 'ق', longPressOptions: ['قّ'] },
      { value: 'ف', longPressOptions: ['فّ'] },
      { value: 'غ', longPressOptions: ['غّ'] },
      { value: 'ع', longPressOptions: ['عّ'] },
      { value: 'ه', longPressOptions: ['هّ'] },
      { value: 'خ', longPressOptions: ['خّ'] },
      { value: 'ح', longPressOptions: ['حّ'] },
      { value: 'ج', longPressOptions: ['جّ'] },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: 'ش', longPressOptions: ['شّ'] },
      { value: 'س', longPressOptions: ['سّ'] },
      { value: 'ي', longPressOptions: ['يّ', 'ى'] },
      { value: 'ب', longPressOptions: ['بّ'] },
      { value: 'ل', longPressOptions: ['لّ', 'لا'] },
      { value: 'ا', longPressOptions: ['أ', 'إ', 'آ', 'ء'] },
      { value: 'ت', longPressOptions: ['تّ', 'ة'] },
      { value: 'ن', longPressOptions: ['نّ'] },
      { value: 'م', longPressOptions: ['مّ'] },
      { value: 'ك', longPressOptions: ['كّ'] },
      { value: 'د', longPressOptions: ['دّ'] },
    ] satisfies KeyDefinition[],
  },
  {
    keys: [
      { value: 'ئ', longPressOptions: ['ئّ'] },
      { value: 'ء', longPressOptions: ['أ', 'إ', 'آ'] },
      { value: 'ؤ', longPressOptions: ['واو'] },
      { value: 'ر', longPressOptions: ['رّ'] },
      { value: 'لا', label: 'لا' },
      { value: 'ى', longPressOptions: ['يّ'] },
      { value: 'ة', longPressOptions: ['ه'] },
      { value: 'و', longPressOptions: ['وّ'] },
      { value: 'ز', longPressOptions: ['زّ'] },
      { value: 'ظ', longPressOptions: ['ظّ'] },
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
      { value: 'ذ' },
      { value: 'خ' },
      { value: 'ث' },
      { value: 'ل' },
      { value: 'ب' },
      { value: 'ف' },
      { value: '،', label: '،' },
      { value: '/', upper: '؟' },
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
        label: 'مسافة',
        isAction: true,
        action: 'space',
        widthMultiplier: 4,
      },
      { value: '.', upper: '؟' },
      { value: '،', upper: '!' },
      {
        value: 'clear',
        label: 'مسح',
        isAction: true,
        action: 'clear',
        widthMultiplier: 1.2,
      },
      {
        value: 'enter',
        label: 'إدخال ↵',
        isAction: true,
        action: 'enter',
        widthMultiplier: 1.8,
      },
    ] satisfies KeyDefinition[],
  },
];

export const arabicLayout = { rows, rtl: true };
