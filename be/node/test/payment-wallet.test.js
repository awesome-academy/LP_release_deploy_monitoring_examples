const test = require('node:test');
const assert = require('node:assert');
const { buildChargeRequest } = require('../payment-wallet');

test('job test dùng khóa sandbox của ví', () => {
  const request = buildChargeRequest({ id: 101, total: 150000 });
  assert.match(request.headers.Authorization, /^Bearer wallet_test_/);
});

test('số tiền và đơn vị tiền tệ lấy từ đơn hàng', () => {
  const request = buildChargeRequest({ id: 101, total: 150000 }, 'wallet_test_xxx');
  assert.deepStrictEqual(request.body, { orderId: 101, amount: 150000, currency: 'VND' });
});
