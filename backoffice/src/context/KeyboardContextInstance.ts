import { createContext } from 'react';
import type { KeyboardContextValue } from '../types/keyboard.types';

export const KeyboardContext = createContext<KeyboardContextValue | null>(null);
