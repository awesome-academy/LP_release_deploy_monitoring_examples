// Cấu hình nút thanh toán bằng ví ở giao diện web (chỉ dùng cho khóa học).
export function walletButtonConfig(env = import.meta.env) {
  const clientId = env.VITE_PAYMENT_WALLET_CLIENT_ID
  if (!clientId) {
    throw new Error('Thiếu biến VITE_PAYMENT_WALLET_CLIENT_ID')
  }
  return { clientId, currency: 'VND' }
}
