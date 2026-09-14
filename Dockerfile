# Estágio de build: gera dist/ (fonte .dc.html + <head> de SEO + ativos).
# O build é puro Node (fs/path), sem dependências nem navegador.
FROM node:20-slim AS build
WORKDIR /app
# IDs públicos do Google (build/tracking.js). A Railway repassa as variáveis do
# serviço como build args; sem elas, valem os padrões versionados no arquivo.
ARG SITE_URL
ARG GA_MEASUREMENT_ID
ARG GOOGLE_ADS_ID
ARG GOOGLE_ADS_LEAD_LABEL
ARG GOOGLE_ADS_CONTACT_LABEL
ARG GTM_ID
ARG GOOGLE_SITE_VERIFICATION
COPY . .
RUN node build/build.js

# Imagem final: só o servidor e as dependências de produção.
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
