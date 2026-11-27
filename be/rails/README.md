# API Rails — hệ thống đặt đồ ăn mẫu, bản 1.5.0

Rails 8.1 chế độ API trên Ruby 4.0, cơ sở dữ liệu PostgreSQL, máy chủ Puma. Route `/health` và `/version` tự viết
(`app/controllers/`); Rails có sẵn `/up` (không kiểm cơ sở dữ liệu). Cổng mặc định 3000.

## Cần có

- Ruby 4.0 (phiên bản ghi ở `.ruby-version`) và Bundler (hoặc chỉ Docker, xem mục cuối).
- Docker để chạy PostgreSQL 18 bằng `compose.yml` ở thư mục gốc `code/` và để build image.

## Biến môi trường

Dự án nạp biến bằng gem [figaro](https://github.com/laserlemon/figaro) 1.3.0. Khi Rails khởi động, figaro đọc
`config/application.yml` và đưa từng khóa vào `ENV`, trước initializer và trước khi kết nối cơ sở dữ liệu. File này
giữ giá trị trên máy bạn, không commit: `.gitignore` có dòng `/config/application.yml` (dòng mà lệnh
`bundle exec figaro install` thêm vào), `.dockerignore` có dòng `config/application.yml`. File mẫu được commit là
`config/application.yml.example`.

| Biến | Bí mật | Lấy từ đâu khi chạy local |
|---|---|---|
| `DATABASE_URL` | có (chứa mật khẩu) | `config/application.yml`: `postgres://food_order:food_order_dev_pw@localhost:5432/food_order`; khối `test:` đổi sang database `api_rails_test` |
| `PAYMENT_WALLET_API_KEY` | có | `config/application.yml`: `wallet_test_xxx` (giá trị giả) |
| `PORT` | không | Shell, mặc định 3000. `bin/rails server` không lấy cổng từ `config/application.yml` |

Biến đã đặt sẵn trong môi trường (shell, job CI, container) **thắng** giá trị trong file: figaro giữ nguyên biến đó
và in ra stderr `WARNING: Skipping key "PAYMENT_WALLET_API_KEY". Already set in ENV.` Muốn dùng giá trị trong file
thì `unset` biến còn sót ở shell. Giá trị trong file viết trong ngoặc kép; giá trị không phải chuỗi (ví dụ `12345`)
vẫn chạy nhưng figaro in `WARNING: Use strings for Figaro configuration. …`.

Khóa ví được kiểm trong `config/initializers/payment_wallet.rb`; sai thì ứng dụng dừng ngay khi khởi động:

| Tình huống | Lỗi |
|---|---|
| Không có khóa: file thiếu dòng, dòng không có giá trị (`PAYMENT_WALLET_API_KEY:`), hoặc không có file và môi trường không đặt biến | `Missing required configuration keys: ["PAYMENT_WALLET_API_KEY"] (Figaro::MissingKeys)` |
| Khóa có nhưng rỗng: `PAYMENT_WALLET_API_KEY: ""` trong file, hoặc biến rỗng ở shell, ở job CI | `FATAL: PAYMENT_WALLET_API_KEY đang để trống (API key của ví điện tử). (RuntimeError)` |

`Figaro.require_keys` chỉ kiểm khóa có trong `ENV` hay không, nên initializer kiểm thêm giá trị rỗng. Kiểm ứng dụng
đã nhận khóa mà không in giá trị ra màn hình: `bin/rails runner 'p ENV.key?("PAYMENT_WALLET_API_KEY")'` (in `true`).

`config/master.key` không có trong repository; development và test không cần khóa này.

## Chạy local

```bash
# Ở thư mục code/: bật PostgreSQL 18 và chờ tới khi healthy
docker compose up -d --wait

cd be/rails
cp config/application.yml.example config/application.yml
bundle install
bin/rails runner 'p ENV["PAYMENT_WALLET_API_KEY"]'   # "wallet_test_xxx"
bin/rails db:migrate
bin/rails server
```

Đổi cổng: `PORT=3001 bin/rails server` hoặc `bin/rails server -p 3001`. Ở một terminal khác:

```bash
curl -i http://localhost:3000/health    # 200 {"status":"ok","db":"up"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/up   # 200, không kiểm cơ sở dữ liệu
```

`/version` đọc `version.json`, file chỉ được ghi lúc build image; chưa có file thì route trả 500. Muốn thử khi chạy
local, ghi tay file này:

```bash
printf '{"version":"%s","commit":"%s"}\n' 1.5.0 "$(git rev-parse HEAD)" > version.json
curl -s http://localhost:3000/version   # {"version":"1.5.0","commit":"<SHA>"}
```

Đọc tín hiệu lỗi: `docker compose stop db` (ở `code/`) rồi gọi lại `/health` → 500 `{"status":"error","db":"down"}`;
log của `bin/rails server` (và `log/development.log`) có dòng `health: DB query failed: …` kèm backtrace. Bật lại
bằng `docker compose start db`.

## Test

Test dùng cơ sở dữ liệu riêng `api_rails_test`: khối `test:` của `config/application.yml` đổi `DATABASE_URL` khi
chạy với `RAILS_ENV=test`.

```bash
RAILS_ENV=test bin/rails db:test:prepare test
```

`db:test:prepare` xóa và tạo lại cơ sở dữ liệu nó trỏ tới. Nếu shell đang có `DATABASE_URL` thì biến đó thắng khối
`test:` và test chạy trên chính database development. Kiểm trước:
`RAILS_ENV=test bin/rails runner 'p ActiveRecord::Base.connection_db_config.database'` phải in `"api_rails_test"`.

`test/payment_wallet_test.rb` cần khóa bắt đầu bằng `wallet_test_`. Workflow CI tương ứng:
`.github/workflows/ci-be-rails.yml` (job có service PostgreSQL 18, Ruby lấy từ `.ruby-version`). Job CI không có
`config/application.yml`: `DATABASE_URL` đặt ở `env` của job, khóa ví lấy từ secret `PAYMENT_WALLET_API_KEY`. Secret
chưa khai thì biến rỗng và job dừng với `FATAL: PAYMENT_WALLET_API_KEY đang để trống …`.

## Build image có version

```bash
VERSION=1.5.0
SHA=$(git rev-parse HEAD)
docker build --build-arg APP_VERSION=$VERSION --build-arg APP_REVISION=$SHA \
  --label org.opencontainers.image.version=$VERSION \
  --label org.opencontainers.image.revision=$SHA \
  -t registry.example.com/food-order/api:$VERSION .
docker image inspect --format '{{json .Config.Labels}}' registry.example.com/food-order/api:$VERSION
docker run --rm registry.example.com/food-order/api:$VERSION ls config   # không có application.yml
```

Image chạy `RAILS_ENV=production`, cài gem không gồm nhóm development và test, ghi `version.json` từ hai build
argument. `.dockerignore` loại `config/application.yml`, file biến, `config/master.key`, `.bundle`, `vendor/bundle`,
nên giá trị trên máy bạn không vào image. File mẫu `config/application.yml.example` vẫn vào image (chỉ có giá trị
giả, figaro không đọc file này). Chưa có Git (tải mã dạng file nén) thì đặt `SHA=local` để thử.

## Chạy image và đọc /version

Image không có `config/application.yml`: mọi biến truyền bằng `-e` (hoặc `environment` của Docker Compose). Thiếu
`PAYMENT_WALLET_API_KEY` thì container dừng ngay với `Figaro::MissingKeys`. Dừng `bin/rails server` trước vì cùng
cổng 3000. Production cần `SECRET_KEY_BASE` (hoặc `RAILS_MASTER_KEY`):

```bash
docker run -d --name food-order-api -p 3000:3000 --add-host=host.docker.internal:host-gateway \
  -e SECRET_KEY_BASE="$(openssl rand -hex 64)" \
  -e DATABASE_URL=postgres://food_order:food_order_dev_pw@host.docker.internal:5432/food_order \
  -e PAYMENT_WALLET_API_KEY=wallet_test_xxx \
  registry.example.com/food-order/api:$VERSION
curl -s http://localhost:3000/version   # {"version":"1.5.0","commit":"<SHA>"}
curl -i http://localhost:3000/health
docker rm -f food-order-api
```

## Chương nào dùng phần nào

| Chương | Phần dùng |
|---|---|
| 1. Cấu hình local và biến môi trường | `config/application.yml.example`, `config/initializers/payment_wallet.rb`, `Gemfile` (gem `figaro`), `Gemfile.lock`, `.ruby-version`, `bundle install`, `bin/rails runner` |
| 2. Chạy ứng dụng local và đọc tín hiệu | `db/migrate/`, `app/controllers/health_controller.rb`, `/up`, log của `bin/rails server` |
| 3. Tích hợp CI | `test/`, `.github/workflows/ci-be-rails.yml` |
| 4. Chuẩn bị artifact có version | `Dockerfile`, `.dockerignore`, lệnh build có `--label` |
| 5. Triển khai non-production | `app/controllers/version_controller.rb` (`/version`), chạy image với biến của môi trường đích |

## Máy chưa cài Ruby

Chạy cùng các lệnh trên trong container `ruby:4.0` (Docker Engine trên Linux hoặc WSL2, vì dùng `--network host`).
Gem cài vào `vendor/bundle` của dự án; container đọc `config/application.yml` trong thư mục dự án. `-e TÊN` chỉ
chuyển biến vào container khi shell đã đặt biến đó, nên biến đặt sẵn vẫn thắng file như khi chạy Ruby trực tiếp:

```bash
cp config/application.yml.example config/application.yml
alias rb40='docker run --rm --init --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -e BUNDLE_PATH=vendor/bundle -e BUNDLE_APP_CONFIG=/tmp/bundle -e PORT -e DATABASE_URL -e PAYMENT_WALLET_API_KEY -e RAILS_ENV -v "$PWD":/app -w /app ruby:4.0'
rb40 bundle install
rb40 bin/rails runner 'p ENV["PAYMENT_WALLET_API_KEY"]'
rb40 bin/rails db:migrate
RAILS_ENV=test rb40 bin/rails db:test:prepare test
rb40 bin/rails server -b 0.0.0.0
```
