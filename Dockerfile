# Estágio de build: gera dist/ (fonte .dc.html + <head> de SEO + ativos).
# O build é puro Node (fs/path), sem dependências nem navegador.
FROM node:20-slim AS build
WORKDIR /app
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
