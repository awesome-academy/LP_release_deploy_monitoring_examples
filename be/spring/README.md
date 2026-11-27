# API Spring Boot — hệ thống đặt đồ ăn mẫu, bản 1.5.0

Spring Boot 4.2 trên Java 25, Maven (qua Maven Wrapper `./mvnw`), JDBC, Flyway, Actuator. Route `/health` tự viết
(`HealthController.java`); version và commit đang chạy đọc qua `/actuator/info`. Cổng mặc định 8080.

## Cần có

- JDK 25 (Maven Wrapper tự tải Maven; Maven tải dependency), hoặc chỉ Docker, xem mục cuối.
- Docker để chạy PostgreSQL 18 bằng `compose.yml` ở thư mục gốc `code/` và để build image.

## Biến môi trường

Spring Boot không có file biến mẫu và không tự đọc file `.env`. Cấu hình nằm ở
`src/main/resources/application.properties`:

| Thuộc tính | Giá trị | Ghi đè bằng biến môi trường |
|---|---|---|
| `spring.datasource.url` | `jdbc:postgresql://localhost:5432/food_order` | `SPRING_DATASOURCE_URL` |
| `spring.datasource.username` / `password` | `food_order` / `food_order_dev_pw` (giá trị dev) | `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` |
| `payment.wallet.api-key` | `${PAYMENT_WALLET_API_KEY}`, không có giá trị mặc định | `PAYMENT_WALLET_API_KEY` (bắt buộc; giá trị giả `wallet_test_xxx`) |

Spring Boot bỏ qua `DATABASE_URL`. Thiếu `PAYMENT_WALLET_API_KEY` thì ứng dụng dừng khi khởi động; lỗi gốc nằm ở
dòng `Caused by: … PlaceholderResolutionException: Could not resolve placeholder 'PAYMENT_WALLET_API_KEY'` cuối log.
`spring.datasource.hikari.connection-timeout=2000` để `/health` trả lỗi sau khoảng 2 giây khi PostgreSQL dừng
(mặc định của HikariCP là 30 giây).

## Chạy local

```bash
# Ở thư mục code/: bật PostgreSQL 18 và chờ tới khi healthy
docker compose up -d --wait

cd be/spring
read -rs -p "PAYMENT_WALLET_API_KEY: " PAYMENT_WALLET_API_KEY && echo   # gõ wallet_test_xxx, khóa không vào lịch sử lệnh
export PAYMENT_WALLET_API_KEY
./mvnw -B -DskipTests package
java -jar target/food-order-api-1.5.0.jar
```

Flyway chạy migration `src/main/resources/db/migration/` ngay lúc khởi động, không có lệnh migrate riêng.
Ở một terminal khác:

```bash
curl -i http://localhost:8080/health            # 200 {"db":"up","status":"ok"} (thứ tự trường có thể đổi)
curl -i http://localhost:8080/actuator/health   # 200 {"status":"UP"}
curl -s http://localhost:8080/actuator/info     # build.version 1.5.0, git.commit.id rút gọn
```

`/actuator/info` lấy version từ `pom.xml` (goal `build-info`) và commit từ `git.properties` do plugin
`git-commit-id-maven-plugin` sinh lúc build. Plugin tìm thư mục `.git` ở thư mục dự án hoặc thư mục cha; không có
`.git` (tải mã dạng file nén) thì build vẫn chạy nhưng `/actuator/info` không có phần commit.

Đọc tín hiệu lỗi: `docker compose stop db` (ở `code/`) rồi gọi lại `/health` → 500 `{"db":"down","status":"error"}`
và log có `health: DB query failed` kèm các dòng `Caused by:`; `/actuator/health` khi đó trả 503. Bật lại bằng
`docker compose start db`.

## Test

```bash
PAYMENT_WALLET_API_KEY=wallet_test_xxx ./mvnw -B test
```

`PaymentWalletTest` không nạp ngữ cảnh Spring nên không cần PostgreSQL; test cần khóa bắt đầu bằng `wallet_test_`.
Workflow CI tương ứng: `.github/workflows/ci-be-spring.yml`.

## Build image có version

`Dockerfile` chép file jar đã build sẵn với tên ghi cứng `target/food-order-api-1.5.0.jar`, nên version trong
`pom.xml` phải khớp version của bản phát hành:

```bash
./mvnw -B -DskipTests package
./mvnw -q help:evaluate -Dexpression=project.version -DforceStdout; echo   # phải in 1.5.0
VERSION=1.5.0
SHA=$(git rev-parse HEAD)
docker build --label org.opencontainers.image.version=$VERSION \
  --label org.opencontainers.image.revision=$SHA \
  -t registry.example.com/food-order/api:$VERSION .
docker image inspect --format '{{json .Config.Labels}}' registry.example.com/food-order/api:$VERSION
```

Image nền `eclipse-temurin:25-jre` dựng trên Ubuntu và mang sẵn label `org.opencontainers.image.version` của
Ubuntu; cờ `--label` của lệnh build ghi đè label đó.

## Chạy image và đọc version

Dừng `java -jar` trước vì cùng cổng 8080:

```bash
docker run -d --name food-order-api -p 8080:8080 --add-host=host.docker.internal:host-gateway \
  -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/food_order \
  -e PAYMENT_WALLET_API_KEY=wallet_test_xxx \
  registry.example.com/food-order/api:$VERSION
curl -s http://localhost:8080/actuator/info
curl -i http://localhost:8080/health
docker rm -f food-order-api
```

## Chương nào dùng phần nào

| Chương | Phần dùng |
|---|---|
| 1. Cấu hình local và biến môi trường | `application.properties`, `PaymentWalletProperties.java`, `pom.xml` (không có file khóa phiên bản), `.mvn/wrapper/` |
| 2. Chạy ứng dụng local và đọc tín hiệu | `db/migration/` (Flyway), `HealthController.java`, `/actuator/health`, log khởi động |
| 3. Tích hợp CI | `src/test/`, `.github/workflows/ci-be-spring.yml` |
| 4. Chuẩn bị artifact có version | `Dockerfile`, `.dockerignore`, version trong `pom.xml`, lệnh build có `--label` |
| 5. Triển khai non-production | `/actuator/info` (build-info, git-commit-id), `management.endpoints.web.exposure.include` |

## Máy chưa cài JDK

Chạy cùng các lệnh trên trong container `maven:3-eclipse-temurin-25` (Docker Engine trên Linux hoặc WSL2, vì dùng
`--network host`). Lệnh gắn cả thư mục gốc của repository để plugin thấy `.git`, và giữ bộ nhớ đệm Maven ở `~/.m2`:

```bash
mkdir -p ~/.m2
alias j25='docker run --rm --init --network host -u "$(id -u):$(id -g)" -e HOME=/tmp -e PAYMENT_WALLET_API_KEY -v "$HOME/.m2":/tmp/.m2 -v "$(git rev-parse --show-toplevel)":/repo -w /repo/be/spring maven:3-eclipse-temurin-25'
read -rs -p "PAYMENT_WALLET_API_KEY: " PAYMENT_WALLET_API_KEY && echo   # gõ wallet_test_xxx, khóa không vào lịch sử lệnh
export PAYMENT_WALLET_API_KEY
j25 ./mvnw -B test
j25 ./mvnw -B -DskipTests package
j25 java -jar target/food-order-api-1.5.0.jar
```

Image `maven` in thêm vài dòng cảnh báo không ghi được `/root/.m2` khi chạy bằng người dùng khác root; bỏ qua được.
