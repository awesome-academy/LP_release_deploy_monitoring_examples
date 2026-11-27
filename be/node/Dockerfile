FROM node:26
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .
# Version và commit của bản build, ghi vào version.json để route /version trả về.
ARG APP_VERSION=dev
ARG APP_REVISION=unknown
RUN printf '{"version":"%s","commit":"%s"}\n' "$APP_VERSION" "$APP_REVISION" > version.json
ENV NODE_ENV=production
CMD ["node", "server.js"]
