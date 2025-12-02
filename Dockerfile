# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

# Install all dependencies (including dev) once for caching and builds.
FROM base AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
# Clear cache and install with explicit platform support
RUN npm cache clean --force
RUN npm ci --verbose
# Force rebuild of native modules for the container platform
RUN npm rebuild lightningcss --verbose

FROM deps AS builder
ENV NODE_ENV=development
# Copy source files (node_modules already installed in deps stage)
COPY . .
# Verify native modules are correct for this platform
RUN npm rebuild lightningcss --verbose
RUN npm run build

# Final runtime image only needs production deps and the build output.
FROM base AS runner
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm cache clean --force
RUN npm ci --omit=dev --verbose
# Rebuild native modules in production too
RUN npm rebuild lightningcss --verbose
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "run", "start"]
