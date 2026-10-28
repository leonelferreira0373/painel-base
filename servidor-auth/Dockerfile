FROM node:24-alpine
WORKDIR /app
COPY auth.mjs ./
USER node
ENV NODE_ENV=production AUTH_PORTA=8787
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8787/api/auth/saude || exit 1
CMD ["node", "auth.mjs"]
