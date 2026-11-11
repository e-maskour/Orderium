import 'server-only';
import type { Locale } from './config';
import { fr, type Dictionary } from './dictionaries/fr';
import { ar } from './dictionaries/ar';

const dictionaries: Record<Locale, Dictionary> = { fr, ar };

export const getDictionary = (locale: Locale): Dictionary => dictionaries[locale];
export type { Dictionary };
