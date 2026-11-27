package com.example.foodorder;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PaymentWalletTest {

    @Test
    void jobTestDungKhoaSandboxCuaVi() {
        PaymentWalletProperties wallet = new PaymentWalletProperties(System.getenv("PAYMENT_WALLET_API_KEY"));
        assertThat(wallet.apiKey()).startsWith("wallet_test_");
    }
}
