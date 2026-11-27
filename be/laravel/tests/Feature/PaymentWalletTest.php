<?php

namespace Tests\Feature;

use Tests\TestCase;

class PaymentWalletTest extends TestCase
{
    public function test_job_test_dung_khoa_sandbox_cua_vi(): void
    {
        $this->assertStringStartsWith('wallet_test_', (string) config('services.payment_wallet.api_key'));
    }
}
