# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app

# ---------------- BUILD ----------------
FROM base AS build

# ВАЖНО: не production здесь!
ENV NODE_ENV=development

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Копируем package.json отдельно для кеша
COPY package.json package-lock.json ./
COPY admin-frontend/package.json admin-frontend/package-lock.json ./admin-frontend/

# Устанавливаем ВСЕ зависимости
RUN npm ci
RUN npm ci --prefix admin-frontend

# Копируем остальной код
COPY . .

# Prisma
RUN npx prisma generate

# Build admin (vite теперь есть)
RUN npm run build --prefix admin-frontend


# ---------------- PROD ----------------
FROM base

ENV NODE_ENV=production

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

# Копируем только результат сборки
COPY --from=build /app /app

EXPOSE 8080
CMD ["npm", "run", "start"]
