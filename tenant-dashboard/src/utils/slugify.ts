/**
 * Converts a display name to a URL-safe slug.
 * "My Restaurant ABC" → "my-restaurant-abc"
 */
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize('NFD') // decompose accented characters
        .replace(/[\u0300-\u036f]/g, '') // strip diacritics
        .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric (keep spaces/hyphens)
        .trim()
        .replace(/\s+/g, '-') // spaces → hyphens
        .replace(/-+/g, '-') // collapse multiple hyphens
        .replace(/^-|-$/g, '') // strip leading/trailing hyphens
}
