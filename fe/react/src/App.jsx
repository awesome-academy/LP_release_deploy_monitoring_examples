function App() {
  return (
    <main>
      <h1>Food Order (React)</h1>
      <p>Wallet client id: <code id="wallet-client-id">{import.meta.env.VITE_PAYMENT_WALLET_CLIENT_ID}</code></p>
      <p>API base URL: <code id="api-base-url">{import.meta.env.VITE_API_BASE_URL}</code></p>
    </main>
  )
}

export default App
