# ---- Build stage ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# SPA build (PWA mód vyžaduje HTTPS + ikony — viz DEPLOY.md)
RUN npx quasar build

# ---- Runtime stage (nginx) ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/spa /usr/share/nginx/html
EXPOSE 80
