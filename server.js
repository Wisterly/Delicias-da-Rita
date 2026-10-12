import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DB_PATH = path.resolve(__dirname, 'data', 'database.json');
const UPLOADS_DIR = path.resolve(__dirname, 'public', 'uploads');
const DIST_DIR = path.resolve(__dirname, 'dist');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initial = {
        settings: { 
          restaurantName: 'Delícias da Rita', 
          tagline: 'O abraço da comida caseira em forma de sabor',
          logoUrl: '/logo-rita.png' 
        },
        products: [],
        orders: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler DB:', err);
    return { settings: {}, products: [], orders: [] };
  }
}

function writeDb(data) {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_PATH, jsonStr, 'utf-8');
    
    // Backup de segurança automático
    const backupPath = path.resolve(path.dirname(DB_PATH), 'database.backup.json');
    fs.writeFileSync(backupPath, jsonStr, 'utf-8');
  } catch (err) {
    console.error('Erro ao gravar DB:', err);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function serveStaticFile(filePath, res) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  return true;
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = req.url || '';
  const pathname = decodeURIComponent(url.split('?')[0]);

  // ==========================================
  // ROTAS DE API (/api/...)
  // ==========================================

  // GET /api/data
  if (pathname === '/api/data' && req.method === 'GET') {
    const db = readDb();
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(db));
    return;
  }

  // POST /api/settings
  if (pathname === '/api/settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const db = readDb();
        db.settings = { ...db.settings, ...payload };
        writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, settings: db.settings }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // POST /api/products
  if (pathname === '/api/products' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const product = JSON.parse(body);
        const db = readDb();
        if (!product.id) {
          product.id = 'prod-' + Date.now();
        }
        const index = db.products.findIndex(p => p.id === product.id);
        if (index >= 0) {
          db.products[index] = { ...db.products[index], ...product };
        } else {
          db.products.unshift(product);
        }
        writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, product }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/products/:id
  if (pathname.startsWith('/api/products/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/products/', '').split('?')[0];
    const db = readDb();
    db.products = db.products.filter(p => p.id !== id);
    writeDb(db);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/orders
  if (pathname === '/api/orders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const order = JSON.parse(body);
        const db = readDb();
        if (!order.id) {
          order.id = 'cmd-' + Date.now();
          order.createdAt = new Date().toISOString();
        }
        order.updatedAt = new Date().toISOString();
        const index = db.orders.findIndex(o => o.id === order.id);
        if (index >= 0) {
          db.orders[index] = { ...db.orders[index], ...order };
        } else {
          db.orders.unshift(order);
        }
        writeDb(db);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, order }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // DELETE /api/orders/:id
  if (pathname.startsWith('/api/orders/') && req.method === 'DELETE') {
    const id = pathname.replace('/api/orders/', '').split('?')[0];
    const db = readDb();
    db.orders = db.orders.filter(o => o.id !== id);
    writeDb(db);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/upload
  if (pathname === '/api/upload' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { dataUrl, filename } = JSON.parse(body);
        if (!dataUrl) throw new Error('Nenhum dado enviado');
        const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) throw new Error('Formato Base64 inválido');
        
        const buffer = Buffer.from(matches[2], 'base64');
        const ext = path.extname(filename || 'image.png') || '.png';
        const safeName = `upload-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
        const targetPath = path.join(UPLOADS_DIR, safeName);
        fs.writeFileSync(targetPath, buffer);

        const publicUrl = `/uploads/${safeName}`;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, url: publicUrl }));
      } catch (e) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ==========================================
  // ARQUIVOS ESTÁTICOS DE UPLOAD (/uploads/...)
  // ==========================================
  if (pathname.startsWith('/uploads/')) {
    const relFile = pathname.replace('/uploads/', '');
    const absPath = path.join(UPLOADS_DIR, relFile);
    if (serveStaticFile(absPath, res)) return;
  }

  // ==========================================
  // ARQUIVOS ESTÁTICOS DE PRODUÇÃO (dist/ ou public/)
  // ==========================================
  if (req.method === 'GET') {
    // 1. Tenta servir de dist (arquivos compilados)
    if (fs.existsSync(DIST_DIR)) {
      const cleanPath = pathname === '/' ? '/index.html' : pathname;
      const fileInDist = path.join(DIST_DIR, cleanPath);
      if (serveStaticFile(fileInDist, res)) return;

      // 2. Se for arquivo da pasta public (ex: /logo-rita.png, /bg-hero.jpg)
      const fileInPublic = path.join(PUBLIC_DIR, cleanPath);
      if (serveStaticFile(fileInPublic, res)) return;

      // 3. SPA Fallback para rotas do frontend
      const indexHtml = path.join(DIST_DIR, 'index.html');
      if (serveStaticFile(indexHtml, res)) return;
    } else {
      // Se dist não existir, tenta servir de public
      const fileInPublic = path.join(PUBLIC_DIR, pathname === '/' ? '/index.html' : pathname);
      if (serveStaticFile(fileInPublic, res)) return;
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Recurso não encontrado' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`  DELÍCIAS DA RITA - SISTEMA DE COMANDAS ATIVO!`);
  console.log(`  Servidor Local: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
