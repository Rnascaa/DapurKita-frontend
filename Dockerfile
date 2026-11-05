# Membangun frontend, lalu melayaninya lewat Caddy yang juga meneruskan /api ke backend.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Skrip prepare hanya menyiapkan service worker mock, yang tidak dipakai di produksi.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build && rm -f dist/mockServiceWorker.js

FROM caddy:2
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
