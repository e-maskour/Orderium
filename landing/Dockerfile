# Build from the repository root (pnpm workspace):
#   docker build -f landing/Dockerfile --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain -t marnova-landing .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY landing/package.json landing/
RUN pnpm install --filter marnova-landing --frozen-lockfile --ignore-scripts
COPY landing landing
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
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
