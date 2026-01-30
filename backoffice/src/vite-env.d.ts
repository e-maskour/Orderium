/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_S3_BASE_URL: string;
  readonly VITE_CLOUDFLARE_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
