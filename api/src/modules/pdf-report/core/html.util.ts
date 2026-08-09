/** Small HTML helpers shared by every template. */

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Converts an arbitrary value to display text.
 *
 * Avoids `String(obj)` producing `[object Object]` in a customer-facing PDF:
 * dates get an ISO representation and other objects are JSON-serialised.
 */
export function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value.toString();
  }
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value) ?? '';
  } catch {
    return '';
  }
}

/**
 * Escapes text for interpolation into HTML.
 *
 * Every value coming from domain data goes through this — report data is
 * tenant-supplied and must never be able to inject markup into the template.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return toText(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/** Escapes a value for use inside a double-quoted CSS `url("…")`. */
export function escapeCssUrl(value: string): string {
  return value.replace(/["\\\n\r]/g, '\\$&');
}

/** Joins fragments, dropping empty/undefined ones. */
export function joinHtml(
  fragments: Array<string | undefined | null | false>,
  separator = '\n',
): string {
  return fragments.filter((f): f is string => Boolean(f)).join(separator);
}

/** Renders `fragment` only when `condition` holds. */
export function when(condition: unknown, fragment: () => string): string {
  return condition ? fragment() : '';
}

/** Collapses runs of whitespace — keeps generated HTML payloads small. */
export function minifyHtml(html: string): string {
  return html
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Builds a `class="a b c"` attribute, skipping falsy entries. */
export function classAttr(
  ...classes: Array<string | undefined | null | false>
): string {
  const list = classes.filter((c): c is string => Boolean(c));
  return list.length ? ` class="${escapeHtml(list.join(' '))}"` : '';
}

/** Builds a `style="…"` attribute from declarations, skipping falsy entries. */
export function styleAttr(
  ...declarations: Array<string | undefined | null | false>
): string {
  const list = declarations.filter((d): d is string => Boolean(d));
  return list.length ? ` style="${escapeHtml(list.join(';'))}"` : '';
}
