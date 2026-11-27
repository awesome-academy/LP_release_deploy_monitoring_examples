# Staging mẫu — triển khai non-production bản 1.5.0

Cấu hình của máy staging mẫu trong câu chuyện (chương 5): Docker Compose chạy PostgreSQL 18, API Node.js và giao diện
web React từ image trên registry: `registry.example.com/food-order/api` cho API và `registry.example.com/food-order/web-staging`
cho giao diện web. Image web đặt tên theo môi trường vì giá trị `VITE_` chốt lúc build; bản cho production là image
khác, `registry.example.com/food-order/web-prod`. Image API dùng chung một tên vì cấu hình nạp lúc chạy. Mọi giá trị là giả.

| Tệp | Vai trò |
|---|---|
| `compose.yml` | Ba service `db`, `api`, `web`; tag image lấy từ biến `API_VERSION`, `WEB_VERSION` (thiếu biến thì Compose dừng ngay với thông báo `thiếu API_VERSION`); health check cho cả ba; `restart: unless-stopped` cho API và web; không mở cổng ra máy chủ |
| `phien-ban.conf` | Version đang triển khai của từng image, Compose đọc bằng `--env-file phien-ban.conf` |
| `deploy-staging.sh` | Script triển khai: `./deploy-staging.sh <api\|web> <version>` ghi version vào `phien-ban.conf`, chạy `docker compose up -d --wait <service>`, in trạng thái |

Hai workflow `.github/workflows/deploy-staging-api.yml` và `deploy-staging-web.yml` (chạy tay bằng
`workflow_dispatch`, nhập version) gọi script này trên runner tự host có nhãn `staging`, với GitHub environment
`staging`. Trên máy staging mẫu, ba tệp trên đặt ở `/srv/food-order/`.

Khóa bí mật trong `compose.yml` (`PAYMENT_WALLET_API_KEY`, mật khẩu cơ sở dữ liệu) là giá trị giả. Trong hệ thống mẫu,
giá trị thật nằm ở secret của environment `staging`; người phụ trách môi trường chép các giá trị đó vào file cấu hình
triển khai mà Docker Compose đọc khi tạo container. Không commit giá trị thật vào repository.

## Thử trên máy của bạn

Cần hai image đã build theo README của `be/node` và `fe/react` (mục "Build image có version", "Build gói và image có version"):
`registry.example.com/food-order/api:1.5.0` và `registry.example.com/food-order/web-staging:1.5.0`. Không có registry thì
image chỉ nằm trên máy; Compose dùng image có sẵn trên máy trước (`pull_policy` mặc định `missing`).

```bash
cd deploy/staging
./deploy-staging.sh api 1.5.0
./deploy-staging.sh web 1.5.0
docker compose --env-file phien-ban.conf ps --format 'table {{.Service}}\t{{.Image}}\t{{.Status}}'
```

Service không mở cổng ra máy chủ, nên gọi thử bằng một container `curl` trong cùng mạng của Compose:

```bash
docker run --rm --network staging-mau_default curlimages/curl -s http://api:3000/version
docker run --rm --network staging-mau_default curlimages/curl -s http://web/version.json
docker inspect --format '{{.Image}}' staging-mau-api-1   # digest của image mà container đang chạy
```

Dọn: `docker compose --env-file phien-ban.conf down` (thêm `-v` thì xóa luôn volume dữ liệu của staging mẫu).

## Đổi sang stack khác

`compose.yml` mẫu chạy API Node.js. Dùng API stack khác thì đổi cổng, biến và lệnh health check của service `api`
(lệnh health check phải dùng công cụ có trong image):

| API | Cổng | Biến cần có (ngoài `PAYMENT_WALLET_API_KEY`) | Đọc version |
|---|---|---|---|
| Node.js | 3000 | `DATABASE_URL` | `/version` |
| Laravel | 8000 | `APP_KEY`, `DB_CONNECTION=pgsql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `SESSION_DRIVER=file`, `CACHE_STORE=file` | `/version` |
| Rails | 3000 | `SECRET_KEY_BASE` (hoặc `RAILS_MASTER_KEY`), `DATABASE_URL` | `/version` |
| Spring Boot | 8080 | `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` | `/actuator/info` |

Giao diện web Vue dùng nguyên service `web`, chỉ khác image `web-staging` được build từ `fe/vue`.
