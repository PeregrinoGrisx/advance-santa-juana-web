/* Lanza auditar-contraste.js sobre todas las paginas y resume los fallos.
   Uso: node assets/js/auditar.js        (con el sitio servido)
        BASE=http://localhost:5473 node assets/js/auditar.js             */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5473';
const PAGINAS = ['index.html', 'especialidades.html', 'especialidad.html', 'nosotros.html',
  'contacto.html', 'noticias.html', 'noticia.html', '404.html'];
const PUERTO = 9391;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const SONDA = fs.readFileSync(path.join(__dirname, 'auditar-contraste.js'), 'utf8');

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PUERTO,
    '--user-data-dir=' + path.join(os.tmpdir(), 'chrome-auditar'), 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 40; i++) {
    try { await (await fetch(`http://127.0.0.1:${PUERTO}/json/version`)).json(); break; }
    catch (e) { await esperar(500); }
  }
  const destino = await (await fetch(`http://127.0.0.1:${PUERTO}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(destino.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pend = new Map();
  ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
  const cmd = (metodo, params = {}) => new Promise((res) => {
    const n = ++id; pend.set(n, res); ws.send(JSON.stringify({ id: n, method: metodo, params })); });

  await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });

  let total = 0;
  for (const pg of PAGINAS) {
    await cmd('Page.navigate', { url: BASE + '/' + pg });
    await esperar(6000);
    /* Las animaciones de entrada dejan los bloques a opacidad 0 y el auditor
       los saltaria: se fuerzan visibles antes de medir. */
    await cmd('Runtime.evaluate', { expression: "document.querySelectorAll('.effectFade').forEach(e=>{e.style.opacity=1;e.style.visibility='visible';e.style.transform='none';});" });
    await esperar(800);
    const r = await cmd('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    const fallos = r.result.value || [];
    total += fallos.length;
    console.log('\n== ' + pg + ' == ' + fallos.length + ' fallos');
    fallos.slice(0, 12).forEach((f) => console.log(
      '   ' + String(f.ratio).padEnd(6) + '(min ' + f.minimo + ')  ' + f.donde.padEnd(34)
      + ' ' + f.color + ' sobre ' + f.fondo + '  "' + f.texto + '"'));
  }
  console.log('\nTOTAL fallos: ' + total);
  ws.close(); chrome.kill(); await esperar(400);
  return total;
}

main().then((n) => process.exit(n ? 1 : 0)).catch((e) => { console.error('FALLO:', e.message); process.exit(2); });
