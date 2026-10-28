# Painel: construção estática (Next.js) e serviço por nginx sem privilégios. Nenhum segredo entra na imagem.
FROM node:22-alpine AS dependencias
WORKDIR /app
# Os ativos do navegador (worker do PDF, motor de OCR e idiomas) são copiados no postinstall.
COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS construcao
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Endereço público do site (metadados, robots e sitemap); ver .env.example.
ARG NEXT_PUBLIC_URL_SITE=
ENV NEXT_PUBLIC_URL_SITE=$NEXT_PUBLIC_URL_SITE
COPY --from=dependencias /app/node_modules ./node_modules
# Só o que a construção precisa: assim, mexer no nginx não obriga a recompilar a aplicação.
COPY package.json package-lock.json next.config.ts tsconfig.json postcss.config.mjs ./
COPY scripts ./scripts
COPY public ./public
COPY src ./src
# Copia para public/vendor o worker do PDF e o motor de OCR com os idiomas, para que nada saia do domínio.
RUN node scripts/copiar-ativos.mjs && npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS servico
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY seguranca.conf /etc/nginx/seguranca.conf
COPY --from=construcao /app/out /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/saude || exit 1
