# syntax = docker/dockerfile:1

ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base
WORKDIR /app

FROM base AS build
ENV NODE_ENV=development

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY admin-frontend/package.json admin-frontend/package-lock.json ./admin-frontend/

RUN npm ci
RUN npm ci --include=dev --prefix admin-frontend

COPY . .

RUN npx prisma generate
RUN npm run build --prefix admin-frontend

FROM base AS final
ENV NODE_ENV=production

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8080
CMD ["npm", "run", "start"]
