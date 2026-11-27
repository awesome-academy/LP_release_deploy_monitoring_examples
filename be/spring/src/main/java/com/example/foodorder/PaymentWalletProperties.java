package com.example.foodorder;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

// Fail fast: thiếu PAYMENT_WALLET_API_KEY thì Spring không resolve được placeholder và ứng dụng không khởi động.
@Component
public class PaymentWalletProperties {

    private final String apiKey;

    public PaymentWalletProperties(@Value("${payment.wallet.api-key}") String apiKey) {
        this.apiKey = apiKey;
    }

    public String apiKey() {
        return apiKey;
    }
}
