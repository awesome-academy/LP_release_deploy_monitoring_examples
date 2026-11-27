require "test_helper"

class PaymentWalletTest < ActiveSupport::TestCase
  test "job test dùng khóa sandbox của ví" do
    assert Rails.configuration.x.payment_wallet_api_key.start_with?("wallet_test_")
  end
end
