# Fail fast: thiếu API key ví điện tử thì không cho ứng dụng khởi động.
# Gem figaro đã nạp config/application.yml vào ENV trước khi initializer chạy; biến đặt sẵn được ưu tiên.
# require_keys chỉ kiểm khóa có trong ENV hay không, nên kiểm thêm giá trị rỗng.
Figaro.require_keys("PAYMENT_WALLET_API_KEY")
if ENV["PAYMENT_WALLET_API_KEY"].empty?
  raise "FATAL: PAYMENT_WALLET_API_KEY đang để trống (API key của ví điện tử)."
end

Rails.configuration.x.payment_wallet_api_key = ENV.fetch("PAYMENT_WALLET_API_KEY")
