<script setup>
const walletClientId = import.meta.env.VITE_PAYMENT_WALLET_CLIENT_ID
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
</script>

<template>
  <main>
    <h1>Food Order (Vue)</h1>
    <p>Wallet client id: <code id="wallet-client-id">{{ walletClientId }}</code></p>
    <p>API base URL: <code id="api-base-url">{{ apiBaseUrl }}</code></p>
  </main>
</template>
