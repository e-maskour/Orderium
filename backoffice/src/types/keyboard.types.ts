// ─── Keyboard Layout Enum ─────────────────────────────────────────────────────

export type KeyboardLayout = 'french' | 'arabic' | 'numeric' | 'symbols';

// ─── Keyboard Theme ───────────────────────────────────────────────────────────

export type KeyboardTheme = 'light' | 'dark';

// ─── Keyboard Shift Mode ──────────────────────────────────────────────────────

export type KeyboardMode = 'lower' | 'upper';

// ─── Auto-layout hint for inputs ─────────────────────────────────────────────

export type AutoLayout = 'numeric' | 'alphabetic' | 'email' | 'phone' | 'search';

// ─── Options for useVirtualKeyboard hook ─────────────────────────────────────

export interface UseVirtualKeyboardOptions {
  /** Force a specific layout when this input is focused */
  autoLayout?: AutoLayout;
  /** Logical field name for context detection */
  fieldName?: string;
  /** Initial value */
  defaultValue?: string;
  /** Called on every keystroke */
  onValueChange?: (value: string) => void;
  /** Called on Enter key press */
  onEnter?: () => void;
  /** Max length constraint */
  maxLength?: number;
}

// ─── Return type of useVirtualKeyboard ───────────────────────────────────────

export interface UseVirtualKeyboardReturn {
  ref: React.RefObject<HTMLInputElement | null>;
  value: string;
  setValue: (value: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputProps: {
    inputMode: 'none';
    readOnly: boolean;
    onFocus: () => void;
    onBlur: () => void;
  };
}

// ─── Keyboard Context Shape ───────────────────────────────────────────────────

export interface KeyboardContextValue {
  /** Whether the keyboard overlay is visible */
  isVisible: boolean;
  /** Currently active layout tab */
  layout: KeyboardLayout;
  /** Shift / caps mode */
  mode: KeyboardMode;
  /** Caps lock engaged */
  capsLock: boolean;
  /** Reference to the currently focused input */
  targetRef: React.RefObject<HTMLInputElement | null> | null;
  /** Current value of the focused input */
  currentValue: string;

  /** Current keyboard theme */
  theme: KeyboardTheme;

  // ── Actions ──
  showKeyboard: (
    ref: React.RefObject<HTMLInputElement | null>,
    value: string,
    options?: UseVirtualKeyboardOptions,
  ) => void;
  hideKeyboard: () => void;
  setLayout: (layout: KeyboardLayout) => void;
  setTheme: (theme: KeyboardTheme) => void;
  toggleMode: () => void;
  toggleCapsLock: () => void;
  handleKey: (key: string) => void;
  updateValue: (value: string) => void;
}

// ─── Layout Tab Definition ────────────────────────────────────────────────────

export interface LayoutTab {
  id: KeyboardLayout;
  label: string;
  ariaLabel: string;
}

// ─── Key Row Definition ───────────────────────────────────────────────────────

export interface KeyRow {
  keys: KeyDefinition[];
}

export interface KeyDefinition {
  /** The value emitted on press (lowercase version) */
  value: string;
  /** Display label override */
  label?: string;
  /** Uppercase variant */
  upper?: string;
  /** Width multiplier relative to standard key (default 1) */
  widthMultiplier?: number;
  /** Whether this is a special/action key (styled differently) */
  isAction?: boolean;
  /** For action keys: the action identifier */
  action?: KeyAction;
  /** Long-press alternatives (e.g. accented chars) */
  longPressOptions?: string[];
  /** CSS class override */
  className?: string;
}

export type KeyAction =
  | 'backspace'
  | 'space'
  | 'enter'
  | 'tab'
  | 'shift'
  | 'capslock'
  | 'clear'
  | 'close'
  | 'switchLayout';
