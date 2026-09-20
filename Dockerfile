# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────────────
# HiGreenPanda — production image
# Multi-stage: deps → build → runtime. The runtime stage carries no compilers,
# no source and no dev dependencies, and runs as a non-root user.
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22.20.0-bookworm-slim AS base
ENV PNPM_HOME=/pnpm NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# --- dependencies ------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# --- build -------------------------------------------------------------------
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Payload needs a value at build time to construct the config; it is never the
# real secret and never reaches the runtime image.
ARG PAYLOAD_SECRET=build-time-placeholder-not-a-secret
ARG NEXT_PUBLIC_SERVER_URL=https://higreenpanda.com
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
RUN npm run build

# --- runtime -----------------------------------------------------------------
# Deliberately minimal: Next's standalone output only. That means no CLIs in
# node_modules/.bin and no src/, so migrations, seeding and TOTP enrolment
# cannot run here — they run in the `tools` service, which is built from the
# `build` stage above. See docker-compose.prod.yml.
FROM node:22.20.0-bookworm-slim AS runtime
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client tini \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

# Uploaded media is a mounted volume, not part of the image.
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media

USER nextjs
EXPOSE 3000
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
