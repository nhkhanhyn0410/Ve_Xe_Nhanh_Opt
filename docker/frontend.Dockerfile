# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/frontend --workspace=packages/api-client --workspace=packages/shared-types --include-workspace-root

FROM deps AS builder
ARG NEXT_PUBLIC_API_BASE=http://localhost:5501/api/v1
ENV NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

COPY tsconfig.base.json ./
COPY apps/frontend apps/frontend
COPY packages/shared-types packages/shared-types
COPY packages/api-client packages/api-client
RUN npm run build:types && npm run build:api-client && npm run build:frontend

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=node:node /app/apps/frontend/public ./apps/frontend/public

USER node
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
