# Mã nguồn thực hành — "Hành trình của bản 1.5.0"

Mã nguồn mẫu để thực hành chuỗi khóa Release, Deployment & Monitoring cho Web Engineer. Cả năm chương dùng chung
một hệ thống: hệ thống đặt đồ ăn mẫu gồm phần **API** chạy phía server và phần **giao diện web** chạy trên trình
duyệt, dữ liệu lưu trong **PostgreSQL**. Team vừa thêm tính năng **thanh toán qua ví điện tử**; thay đổi này đi từ
máy của bạn lên staging dưới dạng bản **1.5.0** (bản đang chạy là 1.4.0; tính năng mới tương thích ngược nên tăng MINOR).

Thư mục này chứa mã của bản 1.5.0 ở cả 6 stack, đã có tính năng ví, test, Dockerfile và cấu hình triển khai mẫu.

## Chọn stack

Bạn chọn **một stack API**, **một stack giao diện web**, hoặc mỗi phía một stack. Mỗi thư mục tự đứng được: có file
biến mẫu, test, Dockerfile và README riêng với lệnh chạy đầy đủ.

| Phần | Thư mục | Stack | Cổng khi chạy local |
|---|---|---|---|
| API | [`be/laravel`](be/laravel/README.md) | Laravel 13 · PHP 8.5 | 8000 |
| API | [`be/rails`](be/rails/README.md) | Rails 8.1 · Ruby 4.0 | 3000 |
| API | [`be/node`](be/node/README.md) | Node.js 26 (`node:http`, `pg`) | 3000 |
| API | [`be/spring`](be/spring/README.md) | Spring Boot 4.2 · Java 25 · Maven | 8080 |
| Giao diện web | [`fe/react`](fe/react/README.md) | React 19 · Vite 8 | 5173 |
| Giao diện web | [`fe/vue`](fe/vue/README.md) | Vue 3.5 · Vite 8 | 5173 |

API nào cũng có `/health` (trạng thái và kết nối cơ sở dữ liệu) và cách đọc version đang chạy: `/version` ở Laravel,
Rails, Node.js; `/actuator/info` ở Spring Boot. Giao diện web ghi version vào `version.json` lúc build.

## Bắt đầu

Cần Docker (để chạy PostgreSQL 18 và build image) và công cụ của stack bạn chọn. README của từng stack có mục chạy
bằng Docker cho máy chưa cài công cụ.

```bash
cd code
docker compose up -d --wait     # PostgreSQL 18: food_order / food_order_dev_pw, database food_order, cổng 5432
docker compose ps
```

Sau đó làm theo README của stack. Dừng PostgreSQL bằng `docker compose stop db`; bật lại bằng
`docker compose start db`. Lệnh `docker compose down -v` xóa luôn volume, mất dữ liệu.

Bốn API dùng chung database `food_order` và đều tạo bảng `orders`. Chuyển sang API khác thì làm sạch trước:

```bash
docker compose exec db psql -U food_order -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
```

## Chương nào dùng phần nào

| Chương | Khóa | Thư mục, tệp | Lệnh chính |
|---|---|---|---|
| 1 | Cấu hình local và biến môi trường | File biến mẫu `be/<stack>/.env.example` (Rails: `config/application.yml.example` của gem figaro; Spring: `src/main/resources/application.properties`), `fe/<stack>/.env.example`; file khai báo dependency và file khóa phiên bản (`package.json` · `package-lock.json`, `composer.json` · `composer.lock`, `Gemfile` · `Gemfile.lock`, `pom.xml`) | `cp .env.example .env` (web: `.env.local`; Rails: `cp config/application.yml.example config/application.yml`), `npm ci`, `composer install`, `bundle install`, `./mvnw -DskipTests verify` |
| 2 | Chạy ứng dụng local và đọc tín hiệu (chỉ API) | `compose.yml`, migration của từng API, route `/health` | `docker compose up -d --wait`, lệnh migrate, lệnh khởi động, `curl -i …/health`, `docker compose stop db` |
| 3 | Tích hợp CI và đối chiếu pipeline | `.github/workflows/ci-be-<stack>.yml`, `ci-fe-<stack>.yml`; test trong từng stack | Lệnh test trong README từng stack |
| 4 | Chuẩn bị artifact có version | `Dockerfile`, `.dockerignore` của từng stack | `docker build --build-arg … --label org.opencontainers.image.version=… --label org.opencontainers.image.revision=…` |
| 5 | Triển khai non-production và xác nhận bản chạy | `deploy/staging/`, `.github/workflows/deploy-staging-api.yml`, `deploy-staging-web.yml`; `/version`, `/actuator/info`, `version.json` | `deploy-staging.sh api 1.5.0`, `curl …/version` |

Tên image theo môi trường: API dùng một image `registry.example.com/food-order/api:<version>` cho mọi môi trường, vì
cấu hình nạp lúc chạy. Giao diện web chốt giá trị `VITE_` lúc build, nên mỗi môi trường một image:
`registry.example.com/food-order/web-staging:<version>` cho staging, `registry.example.com/food-order/web-prod:<version>`
cho production.

Workflow CI lọc theo đường dẫn: thay đổi trong `be/node/**` chỉ chạy `ci-be-node.yml`, tương tự cho các thư mục khác.
Workflow cần secret `PAYMENT_WALLET_API_KEY` (API) và biến `PAYMENT_WALLET_CLIENT_ID`, `API_BASE_URL` (web) trong
cài đặt của repository. Kiểm cú pháp workflow bằng actionlint (đứng ở thư mục gốc của repository):

```bash
docker run --rm -v "$PWD:/repo" --workdir /repo rhysd/actionlint:latest -no-color
```

`.github/actionlint.yaml` khai báo nhãn `staging` của runner tự host mà hai workflow triển khai dùng.

## Phiên bản

| Thành phần | Phiên bản |
|---|---|
| Node.js · npm | 26 · 11 |
| React · Vue · Vite · Vitest | 19 · 3.5 · 8 · 5 |
| PHP · Laravel | 8.5 · 13 |
| Ruby · Rails | 4.0 · 8.1 |
| Java · Spring Boot | 25 · 4.2 |
| PostgreSQL | 18 |
| GitHub Actions | `actions/checkout@v7`, `actions/setup-node@v7`, `shivammathur/setup-php@v2`, `ruby/setup-ruby@v1`, `actions/setup-java@v6` |

Phiên bản dependency ghim trong file khóa của từng stack (Maven không có file khóa: phiên bản ghim trong `pom.xml` và
BOM của Spring Boot).

## Giá trị giả

Mọi khóa, mật khẩu, địa chỉ trong thư mục này là giá trị giả, chỉ dùng trên máy hoặc staging mẫu:
`wallet_test_xxx` (khóa ví phía API), `wallet_client_test_xxx` (mã client công khai phía web), `food_order_dev_pw`,
`staging_pw_xxx` (mật khẩu cơ sở dữ liệu), `example.com` (domain, registry). Không đặt khóa hay host thật vào
repository; file biến trên máy (`.env`, `.env.local`, `config/application.yml` của Rails) đã có trong `.gitignore`.

## Khác với ví dụ trong bài

- Commit, digest, mốc giờ trong bài là của lần build khi soạn bài; mỗi chương dùng một bản build riêng. Build trên
  máy bạn sẽ ra giá trị khác. Hãy đối chiếu trên chính bản bạn build.
- Trong câu chuyện của khóa, API và giao diện web là hai repository riêng, mỗi repository một `ci.yml`. Ở đây sáu
  stack nằm chung một repository, nên workflow đặt ở `.github/workflows/` của thư mục gốc, lọc theo đường dẫn và chạy
  lệnh trong thư mục của stack (`working-directory`).
- Chương 1 có tình huống file mẫu thiếu dòng `PAYMENT_WALLET_API_KEY` hoặc để trống giá trị. Ở đây file mẫu của API
  đã có giá trị giả `wallet_test_xxx` để chạy được ngay; muốn tái hiện tình huống, xóa dòng đó hoặc để trống giá trị
  trong file biến của bạn.
- Staging mẫu ở chương 5 chạy API Node.js và giao diện web React; `deploy/staging/README.md` ghi cách đổi sang stack khác.
# LP_release_deploy_monitoring_examples
