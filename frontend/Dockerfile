# Multi-stage Next.js build using the `output: 'standalone'` mode configured
# in next.config.js. The runner stage ships only the trimmed-down server
# bundle — full node_modules stays in the builder stage.

# ---- Dependencies ---------------------------------------------------------
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- Builder --------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* vars are inlined into the bundle at `next build` time, so
# they must be present during the build stage. The compose file passes these
# as build args. NEXT_PUBLIC_API_URL points at the BFF (e.g.
# http://localhost:3001/api) — MUNICIPALITY_ID lives on the BFF.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ---- Runner ---------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 nextjs

# Copy the standalone server output and static assets. The `standalone`
# directory contains a minimal server.js + the node_modules it actually needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
