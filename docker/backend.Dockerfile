# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --workspace=apps/backend --workspace=packages/shared-types --include-workspace-root

FROM deps AS builder
COPY tsconfig.base.json ./
COPY apps/backend apps/backend
COPY packages/shared-types packages/shared-types
RUN npm run build:types && npm run build:backend


FROM base AS prod-deps
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=apps/backend --workspace=packages/shared-types --include-workspace-root \
    && npm cache clean --force

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5501

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/package.json ./package.json
COPY --from=prod-deps --chown=node:node /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=prod-deps --chown=node:node /app/packages/shared-types/package.json ./packages/shared-types/package.json
COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=node:node /app/packages/shared-types/dist ./packages/shared-types/dist

WORKDIR /app/apps/backend
USER node
EXPOSE 5501
CMD ["node", "dist/main.js"]
