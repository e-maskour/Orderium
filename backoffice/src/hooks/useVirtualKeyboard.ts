import { useCallback, useEffect, useRef, useState } from 'react';
import { useKeyboard } from './useKeyboard';
import type { UseVirtualKeyboardOptions, UseVirtualKeyboardReturn } from '../types/keyboard.types';

/**
 * useVirtualKeyboard — register an input field with the global POS keyboard.
 *
 * @example
 * const { ref, value, onChange, inputProps } = useVirtualKeyboard({ autoLayout: 'numeric' });
 * <input ref={ref} value={value} onChange={onChange} {...inputProps} />
 */
export function useVirtualKeyboard(options?: UseVirtualKeyboardOptions): UseVirtualKeyboardReturn {
  const { showKeyboard, currentValue, isVisible, targetRef: contextTargetRef } = useKeyboard();

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
    showKeyboard(ref as React.RefObject<HTMLInputElement>, value, {
      ...options,
      onValueChange: (v) => {
        setValueInternal(v);
        options?.onValueChange?.(v);
      },
    });
  }, [showKeyboard, value, options]);

  const handleBlur = useCallback(() => {
    // Intentionally no-op: the keyboard hides on outside click (see KeyboardContext)
  }, []);

  const inputProps = {
    inputMode: 'none' as const,
    readOnly: false,
    onFocus: handleFocus,
    onBlur: handleBlur,
    'data-virtual-keyboard': 'true',
  } as const;

  return { ref, value, setValue, onChange, inputProps };
}
