# syntax=docker/dockerfile:1

# ---------- Frontend build ----------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Install deps
COPY Frontend/package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Copy source
COPY Frontend/ ./

# Public build-time args (avoid secrets)
ARG VITE_POCKETBASE_URL
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_SITE_TITLE
ARG VITE_SITE_LOGO
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_CRM_ORDER_ENDPOINT
ARG VITE_PUBLIC_POSTHOG_KEY
ARG VITE_PUBLIC_POSTHOG_HOST
ARG VITE_EVOLUTION_API_KEY
ARG VITE_EVOLUTION_API_URL
ARG VITE_EVOLUTION_INSTANCE_NAME
ARG VITE_ZENTHRA_FRONTEND_URL
ARG VITE_ZENTHRA_AUTH_PATH
ARG WEBHOOK_SERVER_URL
ARG VITE_WEBHOOKS_API_BASE
ARG VITE_GEMINI_API_KEY

# Expose to Vite during build
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_SITE_TITLE=$VITE_SITE_TITLE \
    VITE_SITE_LOGO=$VITE_SITE_LOGO \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_CRM_ORDER_ENDPOINT=$VITE_CRM_ORDER_ENDPOINT \
    VITE_PUBLIC_POSTHOG_KEY=$VITE_PUBLIC_POSTHOG_KEY \
    VITE_PUBLIC_POSTHOG_HOST=$VITE_PUBLIC_POSTHOG_HOST \
    VITE_EVOLUTION_API_KEY=$VITE_EVOLUTION_API_KEY \
    VITE_EVOLUTION_API_URL=$VITE_EVOLUTION_API_URL \
    VITE_EVOLUTION_INSTANCE_NAME=$VITE_EVOLUTION_INSTANCE_NAME \
    VITE_ZENTHRA_FRONTEND_URL=$VITE_ZENTHRA_FRONTEND_URL \
    VITE_ZENTHRA_AUTH_PATH=$VITE_ZENTHRA_AUTH_PATH \
    WEBHOOK_SERVER_URL=$WEBHOOK_SERVER_URL \
    VITE_WEBHOOKS_API_BASE=$VITE_WEBHOOKS_API_BASE \
    VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build the application
RUN npm run build


# ---------- Backend (CMS) build (static) ----------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Install system dependencies for native modules
RUN apk add --no-cache python3 make g++ git

# Install deps
COPY Backend/package*.json ./
RUN npm ci --legacy-peer-deps --no-audit --no-fund

# Copy source
COPY Backend/ ./

# Copy logo files from Frontend to Backend public directory
COPY Frontend/public/karigai-logo.webp ./public/
COPY Frontend/public/karigai-logo-white.webp ./public/

# Public build-time args (avoid secrets)
ARG VITE_POCKETBASE_URL
ARG VITE_SITE_TITLE
ARG VITE_SITE_LOGO
ARG VITE_CMS_BASE
ARG VITE_VAPID_PUBLIC_KEY
ARG VITE_EVOLUTION_API_KEY
ARG VITE_EVOLUTION_API_URL
ARG VITE_EVOLUTION_INSTANCE_NAME
ARG VITE_ZENTHRA_FRONTEND_URL
ARG VITE_ZENTHRA_AUTH_PATH
ARG WEBHOOK_SERVER_URL
ARG VITE_WEBHOOKS_API_BASE
ARG VITE_GEMINI_API_KEY

# Expose to Vite during build
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_SITE_TITLE=$VITE_SITE_TITLE \
    VITE_SITE_LOGO=$VITE_SITE_LOGO \
    VITE_CMS_BASE=$VITE_CMS_BASE \
    VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY \
    VITE_EVOLUTION_API_KEY=$VITE_EVOLUTION_API_KEY \
    VITE_EVOLUTION_API_URL=$VITE_EVOLUTION_API_URL \
    VITE_EVOLUTION_INSTANCE_NAME=$VITE_EVOLUTION_INSTANCE_NAME \
    VITE_ZENTHRA_FRONTEND_URL=$VITE_ZENTHRA_FRONTEND_URL \
    VITE_ZENTHRA_AUTH_PATH=$VITE_ZENTHRA_AUTH_PATH \
    WEBHOOK_SERVER_URL=$WEBHOOK_SERVER_URL \
    VITE_WEBHOOKS_API_BASE=$VITE_WEBHOOKS_API_BASE \
    VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build
RUN npm run build


# ---------- Runtime: single Nginx serving both ----------
FROM nginx:alpine AS runner

# Copy built files
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY --from=backend-builder  /app/backend/dist   /usr/share/nginx/html-cms

# Copy logo files to both directories
COPY --from=frontend-builder /app/frontend/public/karigai-logo.webp /usr/share/nginx/html/
COPY --from=frontend-builder /app/frontend/public/karigai-logo-white.webp /usr/share/nginx/html/
COPY --from=backend-builder /app/backend/public/karigai-logo.webp /usr/share/nginx/html-cms/
COPY --from=backend-builder /app/backend/public/karigai-logo-white.webp /usr/share/nginx/html-cms/
COPY --from=backend-builder /app/backend/public/logo.svg /usr/share/nginx/html-cms/

# Copy combined nginx config
COPY nginx.multi.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
