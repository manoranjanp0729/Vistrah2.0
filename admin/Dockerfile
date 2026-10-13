FROM node:22.16.0-alpine AS deps
WORKDIR /app
COPY admin/package*.json admin/.npmrc ./
RUN npm ci
FROM node:22.16.0-alpine AS builder
WORKDIR /build/admin
COPY --from=deps /app/node_modules ./node_modules
COPY admin/ .
COPY shared/ /build/shared/
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:22.16.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /build/admin/.next/standalone ./
COPY --from=builder --chown=node:node /build/admin/.next/static ./admin/.next/static
COPY --from=builder --chown=node:node /build/admin/public ./admin/public
USER node
EXPOSE 3000
CMD ["node", "admin/server.js"]