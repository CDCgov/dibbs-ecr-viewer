# syntax=docker.io/docker/dockerfile:1.7-labs
FROM node:22-alpine AS base

ARG APP_VERSION
# Prometheus preferred transfer is via HTTP
ARG OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=http/protobuf
ARG OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=http://otel-collector:4318/v1/metrics
# Jaeger preferred routing is gRPC for native OTLP
ARG OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=grpc
ARG OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://otel-collector:4318/v1/traces 

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --exclude=./seed-scripts . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV APP_VERSION=$APP_VERSION
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV OTEL_TRACES_EXPORTER=otlp
ENV OTEL_METRICS_EXPORTER=otlp
ENV OTEL_LOGS_EXPORTER=none
ENV OTEL_EXPORTER_OTLP_METRICS_PROTOCOL=$OTEL_EXPORTER_OTLP_METRICS_PROTOCOL
ENV OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=$OTEL_EXPORTER_OTLP_METRICS_ENDPOINT
ENV OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=$OTEL_EXPORTER_OTLP_TRACES_PROTOCOL
ENV OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=$OTEL_EXPORTER_OTLP_TRACES_ENDPOINT


# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"]
