# API Node.js — hệ thống đặt đồ ăn mẫu, bản 1.5.0

Node.js 26 thuần (`node:http`) và thư viện `pg`. Migration bằng `node-pg-migrate`, test bằng `node --test`,
lint bằng ESLint 10. Cổng mặc định 3000.

## Cần có

- Node.js 26 và npm 11 (hoặc chỉ Docker, xem mục cuối).
- Docker để chạy PostgreSQL 18 bằng `compose.yml` ở thư mục gốc `code/` và để build image.

## Biến môi trường

| Biến | Bí mật | Giá trị trong file mẫu |
|---|---|---|
| `PORT` | không | `3000` |
| `DATABASE_URL` | có (chứa mật khẩu) | `postgres://food_order:food_order_dev_pw@localhost:5432/food_order` |
| `PAYMENT_WALLET_API_KEY` | có | `wallet_test_xxx` (giá trị giả) |

`server.js` nạp file `.env` bằng `process.loadEnvFile()`; biến đã đặt sẵn trong môi trường thắng giá trị trong file.
Thiếu hoặc để trống `PAYMENT_WALLET_API_KEY` thì API in một dòng `FATAL: …` và thoát mã 1.
`node-pg-migrate` và `node --test` không đọc file `.env`, nên hai lệnh đó nhận biến qua môi trường.

## Chạy local

```bash
# Ở thư mục code/: bật PostgreSQL 18 và chờ tới khi healthy
docker compose up -d --wait

cd be/node
cp .env.example .env
npm ci
DATABASE_URL=postgres://food_order:food_order_dev_pw@localhost:5432/food_order npm run migrate
node server.js
```

Ở một terminal khác:

```bash
curl -i http://localhost:3000/health    # 200 {"status":"ok","db":"up"}
curl -s http://localhost:3000/version   # {"version":"dev","commit":"unknown"}: chưa có version.json
```

`version.json` chỉ được ghi lúc build image. Muốn thấy `/version` trả `1.5.0` khi chạy local, ghi tay file này
rồi khởi động lại `node server.js`:

```bash
printf '{"version":"%s","commit":"%s"}\n' 1.5.0 "$(git rev-parse HEAD)" > version.json
```

Đọc tín hiệu lỗi: `docker compose stop db` (ở `code/`) rồi gọi lại `/health` → 500 `{"status":"error","db":"down"}`,
log của `node server.js` in stack trace của lỗi kết nối. Bật lại bằng `docker compose start db`.

## Test và lint

```bash
PAYMENT_WALLET_API_KEY=wallet_test_xxx npm test
npm run lint
```

Test cần khóa bắt đầu bằng `wallet_test_`; thiếu hoặc rỗng thì test lỗi. Workflow CI tương ứng:
`.github/workflows/ci-be-node.yml` (job `lint` rồi job `test`, khóa lấy từ secret của repository).

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

`Dockerfile` ghi `version.json` từ hai build argument; route `/version` đọc file này. Chưa có Git (tải mã dạng
file nén) thì đặt `SHA=local` để thử.

## Chạy image và đọc /version

Dừng `node server.js` trước vì cùng cổng 3000.

```bash
docker run -d --name food-order-api -p 3000:3000 --add-host=host.docker.internal:host-gateway \
  -e DATABASE_URL=postgres://food_order:food_order_dev_pw@host.docker.internal:5432/food_order \
  -e PAYMENT_WALLET_API_KEY=wallet_test_xxx \
  registry.example.com/food-order/api:$VERSION
curl -s http://localhost:3000/version   # {"version":"1.5.0","commit":"<SHA>"}
curl -i http://localhost:3000/health
docker logs food-order-api              # dòng "food-order-api-node 1.5.0 (commit …) listening on :3000"
docker rm -f food-order-api
```

## Chương nào dùng phần nào

| Chương | Phần dùng |
|---|---|
| 1. Cấu hình local và biến môi trường | `.env.example`, `package.json`, `package-lock.json`, `npm ci` |
| 2. Chạy ứng dụng local và đọc tín hiệu | `migrations/`, `server.js` (route `/health`, xử lý lỗi pool), `/health` khi dừng PostgreSQL |
| 3. Tích hợp CI | `test/`, `eslint.config.js`, `.github/workflows/ci-be-node.yml` |
| 4. Chuẩn bị artifact có version | `Dockerfile`, `.dockerignore`, lệnh build có `--label` |
| 5. Triển khai non-production | route `/version`, `deploy/staging/` (staging mẫu chạy API này) |

## Máy chưa cài Node.js

Chạy cùng các lệnh trên trong container `node:26` (Docker Engine trên Linux hoặc WSL2, vì dùng `--network host`):

```bash
alias n26='docker run --rm --init --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -e DATABASE_URL -e PAYMENT_WALLET_API_KEY -v "$PWD":/app -w /app node:26'
n26 npm ci
DATABASE_URL=postgres://food_order:food_order_dev_pw@localhost:5432/food_order n26 npm run migrate
n26 node server.js
```

`-e TÊN_BIẾN` không kèm giá trị chuyển biến đang có trong shell vào container, nên cách đặt biến trước lệnh vẫn dùng được.
