import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Marnova',
    short_name: 'Marnova',
    description: 'L’ERP en ligne des PME marocaines — نظام التسيير السحابي للمقاولات المغربية',
    start_url: '/',
    display: 'browser',
    background_color: '#F5F7FB',
    theme_color: '#2747D9',
    lang: 'fr',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
