# API Laravel — hệ thống đặt đồ ăn mẫu, bản 1.5.0

Laravel 13 trên PHP 8.5, cơ sở dữ liệu PostgreSQL. Route `/health` và `/version` viết trong `routes/web.php`;
Laravel có sẵn `/up` (không kiểm cơ sở dữ liệu). Cổng mặc định của `php artisan serve` là 8000.

## Cần có

- PHP 8.5 có extension `pdo_pgsql`, Composer 2 (hoặc chỉ Docker, xem mục cuối).
- Docker để chạy PostgreSQL 18 bằng `compose.yml` ở thư mục gốc `code/` và để build image.

## Biến môi trường

File mẫu `.env.example`: `DB_*` trỏ tới PostgreSQL ở `127.0.0.1:5432`, `SESSION_DRIVER=file`, `CACHE_STORE=file`,
`QUEUE_CONNECTION=sync` (dự án không có bảng sessions, cache, jobs), `PAYMENT_WALLET_API_KEY=wallet_test_xxx`
(giá trị giả). `APP_KEY` để trống, sinh bằng `php artisan key:generate`.

Đoạn kiểm khóa ví nằm trong `app/Providers/AppServiceProvider.php` (`boot()`), nên chạy ở **mọi** lệnh artisan,
kể cả `package:discover` mà `composer install` gọi sau khi cài. File biến thiếu hoặc để trống
`PAYMENT_WALLET_API_KEY` thì `composer install`, `key:generate`, `migrate`, `serve` đều dừng với dòng
`FATAL: thiếu biến môi trường PAYMENT_WALLET_API_KEY …`.

## Chạy local

```bash
# Ở thư mục code/: bật PostgreSQL 18 và chờ tới khi healthy
docker compose up -d --wait

cd be/laravel
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve
```

Ở một terminal khác:

```bash
curl -i http://localhost:8000/health    # 200 {"status":"ok","db":"up"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/up   # 200, không kiểm cơ sở dữ liệu
```

`/version` đọc `version.json`, file chỉ được ghi lúc build image; chưa có file thì route trả 500. Muốn thử khi chạy
local, ghi tay file này:

```bash
printf '{"version":"%s","commit":"%s"}\n' 1.5.0 "$(git rev-parse HEAD)" > version.json
curl -s http://localhost:8000/version   # {"version":"1.5.0","commit":"<SHA>"}
```

Đọc tín hiệu lỗi: `docker compose stop db` (ở `code/`) rồi gọi lại `/health` → 500 `{"status":"error","db":"down"}`;
lỗi kèm stack trace ghi vào `storage/logs/laravel.log`. Bật lại bằng `docker compose start db`. Sửa file biến khi
`php artisan serve` đang chạy thì phải khởi động lại lệnh này; đã chạy `config:cache` thì chạy thêm `config:clear`.

## Test

```bash
php artisan test
```

`phpunit.xml` đặt SQLite trong bộ nhớ nên test không cần PostgreSQL. `tests/Feature/PaymentWalletTest.php` cần
khóa bắt đầu bằng `wallet_test_`. Workflow CI tương ứng: `.github/workflows/ci-be-laravel.yml` (checkout mới không có
file biến nên job đặt `APP_KEY` tạm và lấy khóa ví từ secret, ở cả step `composer install`).

## Build image có version

```bash
VERSION=1.5.0
SHA=$(git rev-parse HEAD)
docker build --build-arg APP_VERSION=$VERSION --build-arg APP_REVISION=$SHA \
  --label org.opencontainers.image.version=$VERSION \
  --label org.opencontainers.image.revision=$SHA \
  -t registry.example.com/food-order/api:$VERSION .
docker image inspect --format '{{json .Config.Labels}}' registry.example.com/food-order/api:$VERSION
```

`Dockerfile` cài dependency ở chặng `composer:2` (`--no-dev --no-scripts`), chạy bằng `php:8.5-cli` có `pdo_pgsql`,
ghi `version.json` từ hai build argument. `.dockerignore` loại file biến, `vendor`, `auth.json`,
`bootstrap/cache/*.php`. Chưa có Git (tải mã dạng file nén) thì đặt `SHA=local` để thử.

## Chạy image và đọc /version

Dừng `php artisan serve` trước vì cùng cổng 8000. Image không chứa file biến, nên truyền giá trị lúc chạy:

```bash
docker run -d --name food-order-api -p 8000:8000 --add-host=host.docker.internal:host-gateway \
  --env-file .env -e DB_HOST=host.docker.internal \
  registry.example.com/food-order/api:$VERSION
curl -s http://localhost:8000/version   # {"version":"1.5.0","commit":"<SHA>"}
curl -i http://localhost:8000/health
docker rm -f food-order-api
```

## Chương nào dùng phần nào

| Chương | Phần dùng |
|---|---|
| 1. Cấu hình local và biến môi trường | `.env.example`, `config/services.php`, `AppServiceProvider.php`, `composer.json`, `composer.lock`, `composer install` |
| 2. Chạy ứng dụng local và đọc tín hiệu | `database/migrations/`, `routes/web.php` (`/health`), `/up`, `storage/logs/laravel.log` |
| 3. Tích hợp CI | `tests/`, `phpunit.xml`, `.github/workflows/ci-be-laravel.yml` |
| 4. Chuẩn bị artifact có version | `Dockerfile`, `.dockerignore`, lệnh build có `--label` |
| 5. Triển khai non-production | route `/version`, chạy image với biến của môi trường đích |

## Máy chưa cài PHP

Dựng một image PHP 8.5 có `pdo_pgsql` và Composer (chỉ để chạy lệnh, không thuộc dự án), rồi chạy cùng các lệnh trên
trong container (Docker Engine trên Linux hoặc WSL2, vì dùng `--network host`):

```bash
docker build -t food-order-php:8.5 - <<'EOF'
FROM php:8.5-cli
RUN apt-get update -qq && apt-get install -y -qq libpq-dev git unzip >/dev/null \
 && docker-php-ext-install pdo_pgsql >/dev/null
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
EOF
alias php85='docker run --rm --init --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$PWD":/app -w /app food-order-php:8.5'
php85 composer install
php85 php artisan key:generate
php85 php artisan migrate
php85 php artisan test
php85 php artisan serve --host=0.0.0.0
```
