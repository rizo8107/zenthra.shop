# Root Dockerfile building the Frontend app

# ---------- Build stage ----------
FROM node:18-alpine AS builder

# Set workdir to the Frontend subfolder
WORKDIR /app/Frontend

# Copy only package files first (better cache)
COPY Frontend/package*.json ./

# Install deps
RUN npm ci --production=false

# Copy the rest of the Frontend source
COPY Frontend/ ./

# Build args for Vite
ARG VITE_POCKETBASE_URL
ARG VITE_RAZORPAY_KEY_ID
ARG VITE_RAZORPAY_KEY_SECRET
ARG VITE_RAZORPAY_PROXY_URL
ARG VITE_RAZORPAY_PROXY_KEY
ARG VITE_CRM_ORDER_ENDPOINT
ARG VITE_SITE_TITLE
ARG VITE_SITE_LOGO
ARG VITE_GOOGLE_MAPS_API_KEY

# Expose as env during build so Vite can pick them up
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}
ENV VITE_RAZORPAY_KEY_SECRET=${VITE_RAZORPAY_KEY_SECRET}
ENV VITE_RAZORPAY_PROXY_URL=${VITE_RAZORPAY_PROXY_URL}
ENV VITE_RAZORPAY_PROXY_KEY=${VITE_RAZORPAY_PROXY_KEY}
ENV VITE_CRM_ORDER_ENDPOINT=${VITE_CRM_ORDER_ENDPOINT}
ENV VITE_SITE_TITLE=${VITE_SITE_TITLE}
ENV VITE_SITE_LOGO=${VITE_SITE_LOGO}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}

# Build the Vite app
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:alpine

# Copy build output
COPY --from=builder /app/Frontend/dist /usr/share/nginx/html

# Copy Nginx config from the Frontend folder if present, otherwise use default
# Expect a file named nginx.conf under Frontend/
COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
