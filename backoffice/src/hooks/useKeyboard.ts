import { useContext } from 'react';
import { KeyboardContext } from '../context/KeyboardContextInstance';
import type { KeyboardContextValue } from '../types/keyboard.types';

/**
 * useKeyboard — access the global POS virtual keyboard context.
 * Must be used inside <KeyboardProvider>.
 */
export function useKeyboard(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext);
  if (!ctx) {
    throw new Error('useKeyboard must be used inside <KeyboardProvider>');
  }
  return ctx;
}
