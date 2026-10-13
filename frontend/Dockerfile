FROM node:22.16.0-alpine AS deps
WORKDIR /app
COPY frontend/package*.json ./
COPY frontend/.npmrc ./
RUN npm ci
FROM node:22.16.0-alpine AS builder
WORKDIR /build/frontend
COPY --from=deps /app/node_modules ./node_modules
COPY frontend/ .
COPY shared/ /build/shared/
ARG NEXT_PUBLIC_MAPTILER_API_KEY
ENV NEXT_PUBLIC_MAPTILER_API_KEY=$NEXT_PUBLIC_MAPTILER_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=builder --chown=node:node /build/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /build/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=node:node /build/frontend/public ./frontend/public
USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]


