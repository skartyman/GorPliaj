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
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci

COPY public-frontend/package-lock.json public-frontend/package.json ./public-frontend/
RUN npm --prefix public-frontend ci

# Copy application code
COPY . .

# Build React public client as primary static frontend
RUN npm run public:build

# Generate Prisma client after schema is available in image
RUN npx prisma generate


FROM base

# Set production environment only for runtime image
ENV NODE_ENV="production"

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /app /app

EXPOSE 8080
CMD ["npm", "run", "start"]
