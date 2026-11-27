// Phần thanh toán qua ví điện tử của API mẫu (chỉ dùng cho khóa học, không gọi dịch vụ thật).
// Tạo yêu cầu thanh toán gửi sang ví từ một đơn hàng.
function buildChargeRequest(order, apiKey = process.env.PAYMENT_WALLET_API_KEY) {
  if (!apiKey) {
    throw new Error('Thiếu biến môi trường PAYMENT_WALLET_API_KEY');
  }
  return {
    headers: { Authorization: `Bearer ${apiKey}` },
    body: { orderId: order.id, amount: order.total, currency: 'VND' },
  };
}

module.exports = { buildChargeRequest };
