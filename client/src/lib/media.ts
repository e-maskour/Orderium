/**
 * Resolves a media reference coming from the API into a browser-usable URL.
 *
 * The API stores object-storage keys (e.g. `products/42/main.webp`) rather than
 * absolute URLs, so anything that is not already absolute is prefixed with the
 * public media bucket. Returns `undefined` when there is nothing to show — the
 * caller is expected to fall back to a placeholder.
 */
export const resolveMediaUrl = (path?: string | null): string | undefined => {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;
  const base = import.meta.env.VITE_MINIO_PUBLIC_URL || '';
  return `${base}/orderium-media/${path}`;
};
