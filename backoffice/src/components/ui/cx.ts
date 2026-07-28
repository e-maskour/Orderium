/** Tiny classnames helper — joins truthy class strings. */
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
