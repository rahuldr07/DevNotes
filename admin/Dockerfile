# syntax=docker/dockerfile:1
FROM node:22-slim AS deps
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci


FROM node:22-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# BACKEND_URL is read at request time by the BFF route handler, not baked in,
# so the image is the same for every environment.
RUN npm run build


FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

RUN useradd --create-home --uid 10001 devnotes && chown -R devnotes /app
USER devnotes

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD curl -fsS http://127.0.0.1:3000/ || exit 1

CMD ["npm", "run", "start"]
