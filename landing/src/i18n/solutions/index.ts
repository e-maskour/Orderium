import 'server-only';
import type { Locale } from '../config';
import { solutionsFr } from './fr';
import { solutionsAr } from './ar';
import type { SolutionsDictionary } from './types';

export * from './types';

const dictionaries: Record<Locale, SolutionsDictionary> = { fr: solutionsFr, ar: solutionsAr };

export const getSolutions = (locale: Locale): SolutionsDictionary => dictionaries[locale];
