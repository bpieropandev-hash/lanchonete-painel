# syntax=docker/dockerfile:1
# As variáveis NEXT_PUBLIC_* entram no bundle no momento do build:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.sualoja.com.br/api/v1 ...

FROM node:26-trixie-slim AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_NOME_LOJA
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Runtime distroless: só o Node e as bibliotecas de que ele precisa, sem shell,
# gerenciador de pacotes nem utilitários do sistema (menos CVEs e menos superfície).
FROM gcr.io/distroless/nodejs26-debian13:nonroot AS runtime
ENV NODE_ENV=production PORT=3002 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
    CMD ["/nodejs/bin/node", "-e", "const r=require('node:http').get({host:'127.0.0.1',port:process.env.PORT||3002,path:'/login'},s=>process.exit(s.statusCode===200?0:1));r.on('error',()=>process.exit(1));r.setTimeout(2000,()=>r.destroy());"]
# A imagem já usa /nodejs/bin/node como entrypoint e o usuário nonroot (65532).
CMD ["server.js"]
