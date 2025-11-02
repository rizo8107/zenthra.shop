########################################
# Monolithic image: Frontend + CMS
########################################

# ---------- Frontend build ----------
FROM node:18-alpine AS fe-builder
WORKDIR /app/Frontend
COPY Frontend/package*.json ./
RUN npm ci --production=false
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
ENV VITE_POCKETBASE_URL=${VITE_POCKETBASE_URL}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}
ENV VITE_RAZORPAY_KEY_SECRET=${VITE_RAZORPAY_KEY_SECRET}
ENV VITE_RAZORPAY_PROXY_URL=${VITE_RAZORPAY_PROXY_URL}
ENV VITE_RAZORPAY_PROXY_KEY=${VITE_RAZORPAY_PROXY_KEY}
ENV VITE_CRM_ORDER_ENDPOINT=${VITE_CRM_ORDER_ENDPOINT}
ENV VITE_SITE_TITLE=${VITE_SITE_TITLE}
ENV VITE_SITE_LOGO=${VITE_SITE_LOGO}
ENV VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY}
RUN npm run build

# ---------- CMS build ----------
FROM node:20-alpine AS cms-builder
WORKDIR /app/BackendCMS
# Use JSON-array COPY to handle folder name with space
COPY ["Backend CMS/package*.json", "./"]
RUN npm ci --production=false
COPY ["Backend CMS/", "./"]
RUN npm run build && npm run build:server
RUN npm prune --production

# ---------- Final runtime ----------
FROM node:20-alpine
RUN apk add --no-cache nginx

# Create dirs
RUN mkdir -p /usr/share/nginx/html /var/log/nginx /run/nginx /srv/cms

# Copy Frontend build
COPY --from=fe-builder /app/Frontend/dist /usr/share/nginx/html

# Copy CMS runtime
COPY --from=cms-builder /app/BackendCMS/dist-server /srv/cms/dist-server
COPY --from=cms-builder /app/BackendCMS/node_modules /srv/cms/node_modules
COPY --from=cms-builder /app/BackendCMS/package*.json /srv/cms/

# Nginx config with API proxy
COPY Frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Environment
ENV NODE_ENV=production \
    CMS_PORT=3003

EXPOSE 80

# Start CMS (Node) then run Nginx in foreground
CMD sh -c "node /srv/cms/dist-server/server/index.js --port $CMS_PORT & nginx -g 'daemon off;'"
