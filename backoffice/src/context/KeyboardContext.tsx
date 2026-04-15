import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardContext } from './KeyboardContextInstance';
import { useLanguage } from './LanguageContext';
import type {
  AutoLayout,
  KeyboardContextValue,
  KeyboardLayout,
  KeyboardMode,
  KeyboardTheme,
  UseVirtualKeyboardOptions,
} from '../types/keyboard.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a keyboard layout from an input's autoLayout hint or native HTML attributes */
function resolveAutoLayout(
  autoLayout: AutoLayout | undefined,
  inputEl: HTMLInputElement | null,
  lastAlphaLayout: KeyboardLayout,
): KeyboardLayout {
  // Explicit hint takes priority
  if (autoLayout === 'numeric' || autoLayout === 'phone') return 'numeric';
  if (autoLayout === 'email') return 'french';
  if (autoLayout === 'alphabetic' || autoLayout === 'search') return lastAlphaLayout;

  // Fall back to HTML attributes
  if (!inputEl) return lastAlphaLayout;

  const type = inputEl.type?.toLowerCase();
  const name = (inputEl.name || inputEl.id || inputEl.placeholder || '').toLowerCase();
  const dataLayout = inputEl.dataset.keyboardLayout as AutoLayout | undefined;

  if (dataLayout === 'numeric' || type === 'tel' || type === 'number') return 'numeric';
  if (type === 'email' || name.includes('email') || name.includes('mail')) return 'french';
  if (
    name.includes('price') ||
    name.includes('prix') ||
    name.includes('qty') ||
    name.includes('quantity')
  )
    return 'numeric';
  if (name.includes('phone') || name.includes('tel')) return 'numeric';

  return lastAlphaLayout;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface KeyboardProviderProps {
  children: React.ReactNode;
}

export function KeyboardProvider({ children }: KeyboardProviderProps) {
  const { language } = useLanguage();

  // Map app language to keyboard alpha layout
  const appAlphaLayout: KeyboardLayout = language === 'ar' ? 'arabic' : 'french';

  const [isVisible, setIsVisible] = useState(false);
  const [theme, setThemeState] = useState<KeyboardTheme>(
    () => (localStorage.getItem('pk-theme') as KeyboardTheme | null) ?? 'dark',
  );
  const [layout, setLayoutState] = useState<KeyboardLayout>(appAlphaLayout);
  const [mode, setMode] = useState<KeyboardMode>('lower');
  const [capsLock, setCapsLock] = useState(false);
  const [currentValue, setCurrentValue] = useState('');

  // The last used alphabetic layout — always starts from app language
  const lastAlphaLayoutRef = useRef<KeyboardLayout>(appAlphaLayout);

  // Keep keyboard alpha layout in sync when app language changes
  useEffect(() => {
    lastAlphaLayoutRef.current = appAlphaLayout;
    // Only update visible layout if it's currently an alpha layout
    setLayoutState((prev) => (prev === 'french' || prev === 'arabic' ? appAlphaLayout : prev));
  }, [appAlphaLayout]);

  // Ref to the currently focused input — never cleared so it survives hide/reopen
  const targetRef = useRef<HTMLInputElement | null>(null);

  // Mirror of currentValue in a ref so handleKey can read it without a stale closure
  const currentValueRef = useRef('');

  // Pending options for the active input
  const pendingOptionsRef = useRef<UseVirtualKeyboardOptions | undefined>(undefined);

  // External value-change notifier (called whenever value changes via key press)
  const onValueChangeRef = useRef<((v: string) => void) | undefined>(undefined);
  const onEnterRef = useRef<(() => void) | undefined>(undefined);

  const setTheme = useCallback((t: KeyboardTheme) => {
    setThemeState(t);
    localStorage.setItem('pk-theme', t);
  }, []);

  // ── Track if a layout is alphabetic ──
  const isAlphaLayout = (l: KeyboardLayout) => l === 'french' || l === 'arabic';

  const setLayout = useCallback((l: KeyboardLayout) => {
    setLayoutState(l);
    if (isAlphaLayout(l)) lastAlphaLayoutRef.current = l;
  }, []);

  // ── Global auto-bind: any focused input/textarea becomes the keyboard target ──
  useEffect(() => {
    const SKIP_TYPES = new Set([
      'hidden',
      'checkbox',
      'radio',
      'file',
      'submit',
      'button',
      'reset',
      'range',
      'color',
      'image',
    ]);

    const handleFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return;
      if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) return;
      // Allow individual inputs to opt out via data-no-virtual-keyboard attribute
      if ('noVirtualKeyboard' in el.dataset) return;

      // Bind this input as the new keyboard target
      targetRef.current = el as HTMLInputElement;
      currentValueRef.current = el.value;
      // Clear managed callbacks — for plain inputs we rely on DOM dispatch only
      pendingOptionsRef.current = undefined;
      onValueChangeRef.current = undefined;
      onEnterRef.current = undefined;

      // Resolve layout from native input attributes
      const resolved = resolveAutoLayout(
        undefined,
        el as HTMLInputElement,
        lastAlphaLayoutRef.current,
      );
      setLayoutState(resolved);
      if (isAlphaLayout(resolved)) lastAlphaLayoutRef.current = resolved;
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // ── Show keyboard for a given input ──
  const showKeyboard = useCallback(
    (
      ref: React.RefObject<HTMLInputElement | null>,
      value: string,
      options?: UseVirtualKeyboardOptions,
    ) => {
      // Only bind to a real DOM element — ignore null refs (e.g. from the FAB toggle)
      if (ref.current !== null) {
        targetRef.current = ref.current;
        pendingOptionsRef.current = options;
        onValueChangeRef.current = options?.onValueChange;
        onEnterRef.current = options?.onEnter;
        currentValueRef.current = value;
        setCurrentValue(value);

        // Resolve layout
        const resolved = resolveAutoLayout(
          options?.autoLayout,
          ref.current,
          lastAlphaLayoutRef.current,
        );
        setLayoutState(resolved);
        if (isAlphaLayout(resolved)) lastAlphaLayoutRef.current = resolved;
      }

      setIsVisible(true);
    },
    [],
  );

  const hideKeyboard = useCallback(() => {
    setIsVisible(false);
    // Intentionally keep targetRef intact so the keyboard reconnects to the same
    // input when re-opened via the FAB without the user re-focusing the field.
  }, []);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === 'lower' ? 'upper' : 'lower'));
  }, []);

  const toggleCapsLock = useCallback(() => {
    setCapsLock((c) => {
      const next = !c;
      setMode(next ? 'upper' : 'lower');
      return next;
    });
  }, []);

  const updateValue = useCallback((value: string) => {
    currentValueRef.current = value;
    setCurrentValue(value);
    onValueChangeRef.current?.(value);

    // Dispatch a synthetic input event so React-controlled inputs update
    if (targetRef.current) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(targetRef.current, value);
      targetRef.current.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, []);

  // ── Handle a key press from the keyboard UI ──
  const handleKey = useCallback(
    (key: string) => {
      // For auto-bound (unmanaged) inputs: always read from the live DOM value
      // so we stay in sync even if React controlled state diverged from our ref.
      const prev =
        onValueChangeRef.current === undefined && targetRef.current
          ? targetRef.current.value
          : currentValueRef.current;
      const maxLength = pendingOptionsRef.current?.maxLength;

      // Handle non-value-changing actions first (early return)
      switch (key) {
        case '{enter}':
        case 'enter':
          onEnterRef.current?.();
          return;
        case '{tab}':
        case 'tab':
          if (targetRef.current) {
            const focusable = Array.from(
              document.querySelectorAll<HTMLElement>(
                'input[data-virtual-keyboard], textarea[data-virtual-keyboard]',
              ),
            );
            const idx = focusable.indexOf(targetRef.current);
            if (idx !== -1 && focusable[idx + 1]) {
              focusable[idx + 1].focus();
            }
          }
          return;
        case '{close}':
        case 'close':
          hideKeyboard();
          return;
        case 'shift':
          toggleMode();
          return;
        case 'capslock':
          toggleCapsLock();
          return;
      }

      // Compute the next value
      let next = prev;
      switch (key) {
        case '{bksp}':
        case 'backspace':
          next = prev.slice(0, -1);
          break;
        case '{space}':
        case 'space':
          if (!maxLength || prev.length < maxLength) next = prev + ' ';
          break;
        case '{clear}':
        case 'clear':
          next = '';
          break;
        default: {
          const char = mode === 'upper' ? (key.toUpperCase() ?? key) : key;
          if (!maxLength || prev.length < maxLength) next = prev + char;
          // Auto-reset shift (not caps lock) after a keystroke
          if (mode === 'upper' && !capsLock) setMode('lower');
        }
      }

      // Update state and ref synchronously
      currentValueRef.current = next;
      setCurrentValue(next);

      // Notify the registered callback
      onValueChangeRef.current?.(next);

      // Sync the raw DOM input so React's controlled-input diffing picks it up
      if (targetRef.current) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set;
        nativeInputValueSetter?.call(targetRef.current, next);
        targetRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        targetRef.current.dispatchEvent(new Event('change', { bubbles: true }));
      }
    },
    [mode, capsLock, toggleMode, toggleCapsLock, hideKeyboard],
  );

  const value: KeyboardContextValue = {
    isVisible,
    layout,
    mode,
    capsLock,
    targetRef,
    currentValue,
    showKeyboard,
    hideKeyboard,
    setLayout,
    toggleMode,
    toggleCapsLock,
    handleKey,
    updateValue,
    theme,
    setTheme,
  };

  return <KeyboardContext.Provider value={value}>{children}</KeyboardContext.Provider>;
}
