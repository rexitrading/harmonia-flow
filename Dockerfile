# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=harmonia.portaldoarinos57.org

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Serve built app in production mode behind reverse proxy.
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "3000"]
