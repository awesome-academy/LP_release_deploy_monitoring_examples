<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Fail fast: thiếu API key ví điện tử thì không cho ứng dụng khởi động.
        if (! config('services.payment_wallet.api_key')) {
            throw new \RuntimeException('FATAL: thiếu biến môi trường PAYMENT_WALLET_API_KEY (API key của ví điện tử).');
        }
    }
}
