#!/usr/bin/env bash
# Deploy the landing page to the "marnova" VPS (see ~/.ssh/config).
# Build-time settings (GA4 ID, verification codes…) live on the VPS in
# ~/marnova-landing/build.env, so they never need to be committed.
set -euo pipefail
cd "$(dirname "$0")/.."

rsync -az --delete \
  --exclude node_modules --exclude .next --exclude lighthouse --exclude tsconfig.tsbuildinfo \
  package.json pnpm-lock.yaml pnpm-workspace.yaml landing marnova:marnova-landing/

ssh marnova 'set -euo pipefail
  cd ~/marnova-landing
  set -a; . ./build.env; set +a
  docker build -f landing/Dockerfile \
    --build-arg NEXT_PUBLIC_SITE_URL \
    --build-arg NEXT_PUBLIC_API_URL \
    --build-arg NEXT_PUBLIC_GA4_ID \
    --build-arg NEXT_PUBLIC_META_PIXEL_ID \
    --build-arg NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    --build-arg NEXT_PUBLIC_BING_SITE_VERIFICATION \
    -t marnova-landing:latest .
  docker compose up -d --force-recreate'
