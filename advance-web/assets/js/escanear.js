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
    /* NADA EN MOVIMIENTO MIENTRAS SE MIDE.
       Los puntos de paginación cambian de color con una transición, y al
       recorrer la página el escáner los cazaba a medio camino: colores que
       no están en ninguna hoja de estilos ni en la paleta, inventados por el
       navegador al interpolar. Daban avisos de verde que no existían.
       Con las transiciones paradas, lo que se mide es el color de verdad. */
    await cmd('Runtime.evaluate', { expression: `
      (() => {
        const s = document.createElement('style');
        s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
        document.head.appendChild(s);
      })();
    ` });
    await esperar(300);
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
    /* SE RECORRE LA PÁGINA, no se mira solo el primer pantallazo.
       La prueba de «texto tapado» le pregunta al navegador qué hay en un
       punto de la pantalla, y eso solo contesta de lo que está a la vista.
       Mirando una sola vez, el escáner revisaba la primera pantalla de ocho
       páginas y daba el resto por bueno sin haberlo visto. */
    const alto = (await cmd('Runtime.evaluate', { expression: 'document.documentElement.scrollHeight', returnByValue: true })).result.value || 0;
    const pasos = Math.min(14, Math.max(1, Math.ceil(alto / (MOVIL ? 700 : 820))));
    let fallos = [];
    const vistos = new Set();
    let falloSonda = null;

    for (let i = 0; i < pasos; i++) {
      await cmd('Runtime.evaluate', { expression: `window.scrollTo(0, ${i} * ${MOVIL ? 700 : 820});` });
      await esperar(i === 0 ? 300 : 420);
      /* Al desplazar, las animaciones de entrada vuelven a esconder bloques */
      await cmd('Runtime.evaluate', { expression: "document.querySelectorAll('.effectFade').forEach(e=>{e.style.opacity=1;e.style.visibility='visible';e.style.transform='none';});" });
      await esperar(180);
      const r = await cmd('Runtime.evaluate', { expression: SONDA, returnByValue: true });
      if (r.exceptionDetails) { falloSonda = r.exceptionDetails; break; }
      (r.result.value || []).forEach((f) => {
        const clave = f.tipo + f.donde + (f.texto || '') + (f.prop || '') + (f.color || '') + (f.regla || '');
        if (vistos.has(clave)) return;
        vistos.add(clave);
        fallos.push(f);
      });
    }
    if (falloSonda) {
      console.log('\n== ' + pg + ' == ERROR EN LA SONDA');
      console.log(JSON.stringify(falloSonda).slice(0, 600));
      continue;
    }
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
          : t === 'TAPADO' ? `lo tapa ${f.padre}`
            : t === 'SCROLL-LATERAL' ? `${f.px}px de mas, por ${f.padre}`
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
