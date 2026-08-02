# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Vite reads VITE_* env vars at BUILD time and bakes them into the bundle.
# Pass both as build args so the deployed app knows where the API Gateway
# and SignalR hub live. On Render, set these as Environment Variables in
# the dashboard — Render auto-passes them as Docker build args.
ARG VITE_API_URL=http://localhost:5000
ARG VITE_HUB_URL=http://localhost:5000/hubs/poll
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_HUB_URL=$VITE_HUB_URL

COPY package*.json ./
RUN npm install

COPY . ./
RUN npm run build

# ---------- Runtime stage (static files served by nginx) ----------
FROM nginx:alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
