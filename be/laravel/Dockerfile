FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-interaction --no-progress

FROM php:8.5-cli
RUN apt-get update -qq && apt-get install -y -qq libpq-dev >/dev/null \
 && docker-php-ext-install pdo_pgsql >/dev/null
WORKDIR /app
COPY . .
COPY --from=vendor /app/vendor ./vendor
# Version và commit của bản build, ghi vào version.json để route /version trả về.
ARG APP_VERSION=dev
ARG APP_REVISION=unknown
RUN printf '{"version":"%s","commit":"%s"}\n' "$APP_VERSION" "$APP_REVISION" > version.json
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
