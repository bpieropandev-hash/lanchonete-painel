# syntax=docker/dockerfile:1
# As variáveis NEXT_PUBLIC_* entram no bundle no momento do build:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sualoja.com.br/api/v1 ...

FROM node:22-bookworm-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_NOME_LOJA
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3002
CMD ["node", "server.js"]
