ARG NODE_VERSION=20.9.0-alpine

# ---- Build stage -----------------------------------------------------------
FROM node:${NODE_VERSION} AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts --prefer-offline

COPY tsconfig.json ./
COPY src ./src

RUN yarn build

# ---- Runtime stage ---------------------------------------------------------
FROM node:${NODE_VERSION}

WORKDIR /app

# libc6-compat is needed by some native deps used transitively by passport-saml
RUN apk add --no-cache libc6-compat

COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile --ignore-scripts --prefer-offline

COPY --from=builder /app/dist ./dist

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nodejs \
    && mkdir -p /app/data/sessions /app/data/logs \
    && chown -R nodejs:nodejs /app/data

USER nodejs

EXPOSE 3000

CMD ["yarn", "start"]
