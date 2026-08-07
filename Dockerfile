# O Playwright só é necessário no build (pré-render). Ele roda num estágio
# separado para a imagem final ficar enxuta. A tag DEVE bater com a versão do
# playwright no package.json (npm ls playwright) — hoje 1.62.1.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "server/index.js"]
