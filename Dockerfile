# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=22.21.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Ensure build stage installs devDependencies (e.g. vite for admin build)
ENV NODE_ENV=development

# Install backend deps first (better cache reuse)
COPY package.json package-lock.json ./
RUN npm ci

# Install admin frontend deps with devDependencies (vite lives here)
COPY admin-frontend/package.json admin-frontend/package-lock.json ./admin-frontend/
RUN npm ci --prefix admin-frontend --include=dev

# Copy app source after dependency install for better layer caching
COPY . .

# Prisma
RUN npx prisma generate

# Verify Vite local binary is present, then build admin
RUN test -x admin-frontend/node_modules/.bin/vite
RUN cd admin-frontend && npx vite build


FROM base

ENV NODE_ENV=production

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8080
CMD ["npm", "run", "start"]
