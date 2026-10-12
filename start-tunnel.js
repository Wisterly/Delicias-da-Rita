import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const cloudflaredPath = path.resolve(__dirname, 'cloudflared.exe');

console.clear();
console.log('==============================================================');
console.log('   DELÍCIAS DA RITA - SISTEMA DE COMANDAS & ACESSO REMOTO');
console.log('==============================================================\n');

// 1. Iniciar o servidor HTTP + API
console.log('[1/2] Iniciando servidor do sistema na porta ' + PORT + '...');
const serverProcess = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  env: { ...process.env, PORT: String(PORT) },
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('Erro ao iniciar o servidor:', err);
});

// 2. Iniciar o Cloudflare Tunnel
setTimeout(() => {
  console.log('\n[2/2] Criando túnel seguro Cloudflare para acesso remoto (4G/5G)...');

  if (!fs.existsSync(cloudflaredPath)) {
    console.error('ERRO: cloudflared.exe não encontrado em ' + cloudflaredPath);
    return;
  }

  const tunnel = spawn(cloudflaredPath, ['tunnel', '--url', `http://127.0.0.1:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let urlFound = false;

  const handleData = (chunk) => {
    const text = chunk.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !urlFound) {
      urlFound = true;
      const publicUrl = match[0];
      
      const box = `
******************************************************************
*                                                                *
*   SUCESSO! O SISTEMA ESTÁ DISPONÍVEL NA INTERNET:             *
*                                                                *
*   👉 ${publicUrl}
*                                                                *
*   Abra este link em qualquer celular (4G, 5G ou outro Wi-Fi)!  *
*                                                                *
******************************************************************
`;
      console.log(box);

      // Salva no arquivo de texto para facilidade do usuário
      const infoText = `LINK DE ACESSO REMOTO (DELICIAS DA RITA):\n\n${publicUrl}\n\nCopie este link e cole no navegador do seu celular conectado em qualquer rede 4G, 5G ou outro Wi-Fi.\nGerado em: ${new Date().toLocaleString('pt-BR')}\n`;
      fs.writeFileSync(path.join(__dirname, 'LINK_ACESSO_CELULAR.txt'), infoText, 'utf-8');

      // Cria atalho da web .url no Windows
      const shortcutContent = `[InternetShortcut]\nURL=${publicUrl}\n`;
      fs.writeFileSync(path.join(__dirname, 'ABRIR_SISTEMA_REMOTAMENTE.url'), shortcutContent, 'utf-8');
      
      console.log(' Link salvo automaticamente em: LINK_ACESSO_CELULAR.txt');
      console.log(' Pressione Ctrl+C para encerrar quando quiser desligar o sistema.\n');
    }
  };

  tunnel.stdout.on('data', handleData);
  tunnel.stderr.on('data', handleData);

  tunnel.on('close', (code) => {
    console.log(`Túnel Cloudflare encerrado (código ${code})`);
  });

}, 2000);

process.on('SIGINT', () => {
  console.log('\nDesligando sistema...');
  process.exit();
});
