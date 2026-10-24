/* ESCÁNER COMPLETO DEL SITIO.
   Pasa assets/js/escaner-sonda.js por las ocho páginas y resume lo que falla.

   Uso:  node assets/js/escanear.js                  (con el sitio servido)
         TIPO=VERDE node assets/js/escanear.js       (solo una clase de fallo)

   Qué mira, y por qué cada cosa:
   - VERDE: por tono, no por código. Buscarlo escrito a mano falló cuatro veces
     seguidas, porque volvía en rgba(), dentro de un SVG o compuesto por capas.
   - CONTRASTE y CONTRASTE-HOVER: el reposo y el estado al pasar el ratón.
   - DESBORDE: lo que se sale de su caja.
   - ICONO: dibujos que se pierden contra su propio fondo.

   Da 0 cuando el sitio está limpio. Mientras no dé 0, no está. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5473';
const SOLO = process.env.TIPO || '';
const PAGINAS = ['index.html', 'especialidades.html', 'especialidad.html', 'nosotros.html',
  'contacto.html', 'noticias.html', 'noticia.html', '404.html'];
const PUERTO = 9392;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const SONDA = fs.readFileSync(path.join(__dirname, 'escaner-sonda.js'), 'utf8');

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PUERTO,
    '--user-data-dir=' + path.join(os.tmpdir(), 'chrome-escaner'), 'about:blank'], { stdio: 'ignore' });
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

  /* ANCHO=390 para revisar el móvil. No es un extra: el escritorio perdona
     casi todo, y los desbordes y los apelotonamientos salen al estrechar. */
  const ANCHO = parseInt(process.env.ANCHO || '1600', 10);
  const MOVIL = ANCHO < 768;
  await cmd('Page.enable');
  await cmd('Emulation.setDeviceMetricsOverride',
    { width: ANCHO, height: MOVIL ? 780 : 900, deviceScaleFactor: 1, mobile: MOVIL,
      screenWidth: ANCHO, screenHeight: MOVIL ? 780 : 900 });
  if (MOVIL) {
    await cmd('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      platform: 'Android',
    });
  }
  console.log('Escaneando a ' + ANCHO + ' px' + (MOVIL ? ' (móvil)' : ' (escritorio)'));

  const cuenta = {};
  let total = 0;
  for (const pg of PAGINAS) {
    await cmd('Page.navigate', { url: BASE + '/' + pg });
    await esperar(6000);
    /* ABRIR TODO ANTES DE MIRAR.
       Dos motivos, y los dos han escondido fallos reales:
       - Las animaciones de entrada dejan medio sitio a opacidad 0.
       - Y lo que de verdad costó encontrar: el contenido plegado. El acordeón
         de especialidades guarda sus paneles con display:none, así que las
         etiquetas de dentro —que estaban en verde azulado sobre oscuro— no
         las medía nadie. El escáner daba limpio por no haber mirado.
       Así que se revela todo: animaciones, acordeones, pestañas y menús. */
    await cmd('Runtime.evaluate', { expression: `
      document.querySelectorAll('.effectFade').forEach(e=>{e.style.opacity=1;e.style.visibility='visible';e.style.transform='none';});
      document.querySelectorAll('.collapse, .accordion-collapse').forEach(e=>{e.classList.add('show');e.style.height='auto';});
      document.querySelectorAll('.collapsed').forEach(e=>e.classList.remove('collapsed'));
      document.querySelectorAll('.tab-pane, .tab-content > *').forEach(e=>e.classList.add('active','show'));
      /* El menú desplegable del móvil NO se abre a la fuerza. Se intentó, y lo
         que medía era una mentira: sacado de su sitio, sus enlaces blancos
         quedaban sobre el fondo claro de la página en vez de sobre el panel
         oscuro que llevan detrás de verdad. El escáner acusaba nueve fallos
         que no existían. Lo del móvil se mira con el ancho del móvil. */
    ` });
    await esperar(1200);
    const r = await cmd('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    if (r.exceptionDetails) {
      console.log('\n== ' + pg + ' == ERROR EN LA SONDA');
      console.log(JSON.stringify(r.exceptionDetails).slice(0, 600));
      continue;
    }
    let fallos = r.result.value || [];
    if (SOLO) fallos = fallos.filter((f) => f.tipo === SOLO);
    total += fallos.length;
    fallos.forEach((f) => { cuenta[f.tipo] = (cuenta[f.tipo] || 0) + 1; });

    console.log('\n== ' + pg + ' == ' + fallos.length + ' fallos');
    const porTipo = {};
    fallos.forEach((f) => { (porTipo[f.tipo] = porTipo[f.tipo] || []).push(f); });
    Object.keys(porTipo).sort().forEach((t) => {
      console.log('  -- ' + t + ' (' + porTipo[t].length + ')');
      porTipo[t].slice(0, 14).forEach((f) => {
        const extra = t === 'VERDE' ? `${f.prop}=${f.color} tono ${f.tono}`
          : t === 'DESBORDE' ? `${f.eje} ${f.px !== undefined ? f.px + 'px fuera de ' + f.padre : f.contenido + ' en ' + f.caja}`
            : `${f.ratio}:1 (min ${f.minimo}) ${f.color || ''} sobre ${f.fondo || ''}`;
        console.log('     ' + f.donde.padEnd(42).slice(0, 42) + ' ' + extra
          + (f.texto ? '  «' + f.texto + '»' : '') + (f.regla ? '  [' + f.regla + ']' : ''));
      });
      if (porTipo[t].length > 14) console.log('     … y ' + (porTipo[t].length - 14) + ' más');
    });
  }

  console.log('\n======================================');
  Object.keys(cuenta).sort().forEach((t) => console.log('  ' + t.padEnd(18) + cuenta[t]));
  console.log('  TOTAL             ' + total);
  ws.close(); chrome.kill(); await esperar(400);
  return total;
}

main().then((n) => process.exit(n ? 1 : 0)).catch((e) => { console.error('FALLO:', e.message); process.exit(2); });
