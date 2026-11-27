const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

// Nạp file cấu hình cục bộ nếu có (Node 20.12+); biến môi trường thật luôn thắng.
try { process.loadEnvFile(); } catch { /* không có file cấu hình: dùng biến môi trường */ }

// Version và commit do bước build image ghi vào version.json (quy ước của team).
let build = { version: 'dev', commit: 'unknown' };
try {
  build = JSON.parse(fs.readFileSync(path.join(__dirname, 'version.json'), 'utf8'));
} catch { /* chạy trên máy dev, không có version.json */ }

const walletKey = process.env.PAYMENT_WALLET_API_KEY;
if (!walletKey) {
  console.error('FATAL: thiếu biến môi trường PAYMENT_WALLET_API_KEY (API key của ví điện tử). Dừng khởi động.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2000 });
// Không có handler này, DB sập làm kết nối rảnh phát 'error' và kéo sập cả tiến trình.
pool.on('error', (err) => console.error('pool: idle client error:', err.message));
const port = Number(process.env.PORT || 3000);

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/version') {
    send(res, 200, build);
    return;
  }
  if (req.method === 'GET' && req.url === '/health') {
    try {
      await pool.query('SELECT 1');
      send(res, 200, { status: 'ok', db: 'up' });
    } catch (err) {
      console.error('health: DB query failed:', err);
      send(res, 500, { status: 'error', db: 'down' });
    }
    return;
  }
  send(res, 404, { error: 'not found' });
});

server.listen(port, () => console.log(`food-order-api-node ${build.version} (commit ${build.commit.slice(0, 7)}) listening on :${port}`));
