# Giao diện web React — hệ thống đặt đồ ăn mẫu, bản 1.5.0

React 19 và Vite 8 (tạo từ template `react` của create-vite), test bằng Vitest 5, lint bằng oxlint. Cổng dev 5173.
Image chạy `nginx:1.31-alpine`, phục vụ thư mục build `dist/`. Version của bản build nằm ở file `version.json`
sinh lúc build.

## Cần có

- Node.js 26 và npm 11 (hoặc chỉ Docker, xem mục cuối).
- Docker để build và chạy image.

## Biến môi trường

| Biến | Giá trị trong file mẫu | Ghi chú |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Địa chỉ API |
| `VITE_PAYMENT_WALLET_CLIENT_ID` | `wallet_client_test_xxx` | Mã client công khai của ví (sandbox, giá trị giả) |

Chỉ biến có tiền tố `VITE_` được đưa vào gói gửi cho trình duyệt, và giá trị được thay thẳng vào JavaScript lúc
build: đổi giá trị phải build lại, và **không bao giờ** đặt bí mật ở đây. `.gitignore` của template chỉ bỏ qua
`*.local` (không bỏ qua `.env`), nên chép file mẫu thành `.env.local`. Biến đặt sẵn trong shell thắng giá trị trong file.

## Chạy local

```bash
cd fe/react
cp .env.example .env.local
npm ci
npm run dev        # http://localhost:5173
```

Trang hiện hai giá trị đã nhúng (mã client của ví, địa chỉ API); không cần API chạy để mở trang.

## Test và lint

```bash
VITE_PAYMENT_WALLET_CLIENT_ID=wallet_client_test_xxx npx vitest run
npm run lint
```

Test của nút thanh toán (`src/payment-wallet.test.js`) cần mã client bắt đầu bằng `wallet_client_test_`. Workflow CI
tương ứng: `.github/workflows/ci-fe-react.yml` (job `lint`, `test`, rồi `build` khi push; giá trị lấy từ `vars`).

## Build gói và image có version

`Dockerfile` chỉ chép `dist/` vào nginx, nên phải build gói và ghi `version.json` trước khi build image
(`--build-arg` không có tác dụng với Dockerfile này):

```bash
VERSION=1.5.0
SHA=$(git rev-parse HEAD)
npm ci
VITE_API_BASE_URL=https://api.staging.example.com \
VITE_PAYMENT_WALLET_CLIENT_ID=wallet_client_test_xxx npm run build
printf '{"version":"%s","commit":"%s","environment":"staging"}\n' "$VERSION" "$SHA" > dist/version.json
grep -oh "https://api.staging.example.com\|wallet_client_test_xxx" dist/assets/*.js | sort | uniq -c
docker build --label org.opencontainers.image.version=$VERSION \
  --label org.opencontainers.image.revision=$SHA \
  -t registry.example.com/food-order/web-staging:$VERSION .
docker image inspect --format '{{json .Config.Labels}}' registry.example.com/food-order/web-staging:$VERSION
```

Gói này mang giá trị của staging vì giá trị `VITE_` chốt lúc build, nên image đặt tên `web-staging`. Bản cho
production build lại từ cùng commit với giá trị của production và đặt tên `registry.example.com/food-order/web-prod:$VERSION`. `vite build` chạy ở mode production (nạp cả
`.env.production` nếu có); trường `environment` trong `version.json` chỉ là nhãn do bước build ghi. Chưa có Git (tải
mã dạng file nén) thì đặt `SHA=local` để thử.

## Chạy image và đọc version.json

```bash
docker run -d --name food-order-web -p 8081:80 registry.example.com/food-order/web-staging:$VERSION
curl -s http://localhost:8081/version.json   # {"version":"1.5.0","commit":"<SHA>","environment":"staging"}
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/
docker rm -f food-order-web
```

Web không có route health riêng; staging mẫu (`deploy/staging/compose.yml`) dùng `/version.json` làm health check.
nginx mặc định không gửi `Cache-Control`, nên trình duyệt có thể dùng lại `index.html`, `version.json` cũ.

## Chương nào dùng phần nào

| Chương | Phần dùng |
|---|---|
| 1. Cấu hình local và biến môi trường | `.env.example`, `.gitignore` (`*.local`), `package.json`, `package-lock.json`, `npm ci` |
| 2. Chạy ứng dụng local và đọc tín hiệu | không dùng (chương này chỉ có API) |
| 3. Tích hợp CI | `src/payment-wallet.test.js`, `app.test.js`, `.oxlintrc.json`, `.github/workflows/ci-fe-react.yml` |
| 4. Chuẩn bị artifact có version | build gói, `dist/version.json`, `Dockerfile`, `.dockerignore`, lệnh build có `--label` |
| 5. Triển khai non-production | `version.json`, `deploy/staging/` (staging mẫu chạy giao diện web này) |

## Máy chưa cài Node.js

Chạy cùng các lệnh trên trong container `node:26` (Docker Engine trên Linux hoặc WSL2, vì dùng `--network host`):

```bash
alias n26='docker run --rm --init --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -e VITE_API_BASE_URL -e VITE_PAYMENT_WALLET_CLIENT_ID -v "$PWD":/app -w /app node:26'
n26 npm ci
n26 npm run dev
VITE_PAYMENT_WALLET_CLIENT_ID=wallet_client_test_xxx n26 npx vitest run
VITE_API_BASE_URL=https://api.staging.example.com VITE_PAYMENT_WALLET_CLIENT_ID=wallet_client_test_xxx n26 npm run build
```
