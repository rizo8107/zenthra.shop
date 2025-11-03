# syntax=docker/dockerfile:1

# ---------- Frontend build ----------
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

# Install deps
COPY Frontend/package*.json ./
RUN npm ci --legacy-peer-deps || npm install

# Copy source
COPY Frontend/ ./

# Public build-time args (avoid secrets)
ARG VITE_POCKETBASE_URL
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_SITE_TITLE
ARG VITE_SITE_LOGO
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_CRM_ORDER_ENDPOINT

# Expose to Vite during build
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_RAZORPAY_KEY_ID=$VITE_RAZORPAY_KEY_ID \
    VITE_SITE_TITLE=$VITE_SITE_TITLE \
    VITE_SITE_LOGO=$VITE_SITE_LOGO \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY \
    VITE_CRM_ORDER_ENDPOINT=$VITE_CRM_ORDER_ENDPOINT

# Build
RUN npm run build


# ---------- Backend (CMS) build (static) ----------
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend

# Install deps
COPY Backend/package*.json ./
RUN npm ci --legacy-peer-deps || npm install

# Copy source
COPY Backend/ ./

# Public build-time args (avoid secrets)
ARG VITE_POCKETBASE_URL
ARG VITE_SITE_TITLE
ARG VITE_SITE_LOGO

# Expose to Vite during build
ENV VITE_POCKETBASE_URL=$VITE_POCKETBASE_URL \
    VITE_SITE_TITLE=$VITE_SITE_TITLE \
    VITE_SITE_LOGO=$VITE_SITE_LOGO

# Build
RUN npm run build


# ---------- Runtime: single Nginx serving both ----------
FROM nginx:alpine AS runner

# Copy builds
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html
COPY --from=backend-builder  /app/backend/dist   /usr/share/nginx/html-cms

# Copy combined nginx config
COPY nginx.multi.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
