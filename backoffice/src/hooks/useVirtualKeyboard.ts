import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboard } from './useKeyboard';
import type { UseVirtualKeyboardOptions, UseVirtualKeyboardReturn } from '../types/keyboard.types';

/** Returns true when the virtual keyboard system is active (desktop ≥ 1024px). */
function useIsVirtualKeyboardEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => window.matchMedia('(min-width: 1024px)').matches);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setEnabled(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return enabled;
}

/**
 * useVirtualKeyboard — register an input field with the global POS keyboard.
 *
 * @example
 * const { ref, value, onChange, inputProps } = useVirtualKeyboard({ autoLayout: 'numeric' });
 * <input ref={ref} value={value} onChange={onChange} {...inputProps} />
 */
export function useVirtualKeyboard(options?: UseVirtualKeyboardOptions): UseVirtualKeyboardReturn {
  const { showKeyboard, currentValue, isVisible, targetRef: contextTargetRef } = useKeyboard();
  const vkEnabled = useIsVirtualKeyboardEnabled();

  const [value, setValueInternal] = useState(options?.defaultValue ?? '');
  const ref = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. controlled parent) back to local state
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValueInternal(e.target.value);
      options?.onValueChange?.(e.target.value);
    },
    [options],
  );

  // When the keyboard emits a value change for OUR input, sync it here
  useEffect(() => {
    if (!isVisible) return;
    if (contextTargetRef?.current !== ref.current) return;
    setValueInternal(currentValue);
  }, [currentValue, isVisible, contextTargetRef]);

  const setValue = useCallback(
    (v: string) => {
      setValueInternal(v);
      options?.onValueChange?.(v);
    },
    [options],
  );

  const handleFocus = useCallback(() => {
    // On mobile/tablet the virtual keyboard is hidden — let the native keyboard handle input
    if (!vkEnabled) return;
    showKeyboard(ref as React.RefObject<HTMLInputElement>, value, {
      ...options,
      onValueChange: (v) => {
        setValueInternal(v);
        options?.onValueChange?.(v);
      },
    });
  }, [vkEnabled, showKeyboard, value, options]);

  const handleBlur = useCallback(() => {
    // Intentionally no-op: the keyboard hides on outside click (see KeyboardContext)
  }, []);

  const inputProps = {
    // Suppress native keyboard only when the virtual keyboard is active (desktop)
    inputMode: (vkEnabled ? 'none' : 'text') as 'none' | 'text',
    readOnly: false,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'data-virtual-keyboard': 'true',
  } as const;

  return { ref, value, setValue, onChange, inputProps };
}
