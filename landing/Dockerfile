# Build from the repository root (pnpm workspace):
#   docker build -f landing/Dockerfile \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://mar-nova.com \
#     --build-arg NEXT_PUBLIC_API_URL=https://orderium-api.mar-nova.com \
#     --build-arg NEXT_PUBLIC_GA4_ID=G-XXXXXXXXXX \
#     --build-arg NEXT_PUBLIC_META_PIXEL_ID=000000000000000 \
#     -t marnova-landing .
# SITE_URL and API_URL are required (canonical URLs + lead form); the two
# analytics IDs are optional — without them no tracking script is loaded.
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY landing/package.json landing/
RUN pnpm install --filter marnova-landing --frozen-lockfile --ignore-scripts
COPY landing landing
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GA4_ID
ARG NEXT_PUBLIC_META_PIXEL_ID
ARG NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
ARG NEXT_PUBLIC_BING_SITE_VERIFICATION
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GA4_ID=$NEXT_PUBLIC_GA4_ID \
    NEXT_PUBLIC_META_PIXEL_ID=$NEXT_PUBLIC_META_PIXEL_ID \
    NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=$NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION \
    NEXT_PUBLIC_BING_SITE_VERIFICATION=$NEXT_PUBLIC_BING_SITE_VERIFICATION \
    NEXT_TELEMETRY_DISABLED=1
RUN test -n "$NEXT_PUBLIC_SITE_URL" || (echo "NEXT_PUBLIC_SITE_URL build arg is required" && exit 1)
RUN pnpm --filter marnova-landing build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo/landing/.next/standalone ./
COPY --from=build /repo/landing/.next/static ./landing/.next/static
COPY --from=build /repo/landing/public ./landing/public
USER node
EXPOSE 3000
CMD ["node", "landing/server.js"]
