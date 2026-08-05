// HTTPS 本地开发服务器 — 用于手机 PWA 安装测试
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8443;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pem': 'application/x-pem-file'
};

function serveFile(req, res) {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(ROOT, 'index.html'), (err2, data2) => {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(data2);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
}

// 启动 HTTPS 服务器（优先）
const keyPath = path.join(ROOT, 'key.pem');
const certPath = path.join(ROOT, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);

    const httpsServer = https.createServer({ key, cert }, serveFile);
    httpsServer.listen(PORT, '0.0.0.0', () => {
      console.log('HTTPS 服务器已启动:');
      console.log('  电脑访问: https://localhost:' + PORT);
      console.log('  手机访问: https://<你的电脑IP>:' + PORT);
      console.log('  注意: 手机首次打开需点击"高级"→"继续访问"');
    });
    httpsServer.on('error', (e) => {
      console.error('HTTPS Server Error:', e.message);
    });
  } catch (e) {
    console.error('HTTPS 启动失败:', e.message);
    console.error('错误详情:', e.stack);
    startHTTP();
  }
} else {
  console.log('未找到证书文件，使用 HTTP');
  startHTTP();
}

function startHTTP() {
  http.createServer(serveFile).listen(PORT, '0.0.0.0', () => {
    console.log('HTTP 服务器已启动: http://localhost:' + PORT);
  });
}
