# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY package.json bun.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/cli/package.json ./packages/cli/

RUN bun install --frozen-lockfile

# Build the app
FROM base AS builder
WORKDIR /app

# Install Node.js for Next.js build (Next.js requires Node)
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build shared package first
RUN bun run --filter @afterburn/shared build

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
# Provide dummy DATABASE_URL for build (Next.js needs it during static analysis)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN bun run --filter web build

# Production runner
FROM base AS runner
WORKDIR /app

# Install Node.js for running Next.js
RUN apt-get update && apt-get install -y nodejs && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
