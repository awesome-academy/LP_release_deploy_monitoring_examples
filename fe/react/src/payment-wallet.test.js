import { describe, it, expect } from 'vitest'
import { walletButtonConfig } from './payment-wallet.js'

describe('nút thanh toán bằng ví', () => {
  it('job test dùng mã client sandbox', () => {
    expect(walletButtonConfig().clientId).toMatch(/^wallet_client_test_/)
  })
})
