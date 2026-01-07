# Multi-stage build for Angular Frontend
# Optimized for Docker layer caching

# Stage 1: Dependencies (cached layer)
FROM node:22-alpine AS deps
WORKDIR /app

# Copy package files first for better caching
COPY package.json package-lock.json ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Copy source code
COPY . .

# Build with production config
RUN npm run build -- --configuration=production

# Stage 2: Serve with nginx
FROM nginx:alpine
LABEL maintainer="Thanh Dev"
LABEL description="LMS Frontend Angular App"

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app
COPY --from=builder /app/dist/lms-frontend/browser /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
