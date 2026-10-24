/* Genera assets/css/fondos-oscuros.css midiendo el fondo REAL de cada bloque.

   El template mezcla secciones oscuras con cajas blancas encima, y la misma
   clase (.text-white, .title, .adv-chip…) aparece en los dos contextos. Por eso
   adivinar por nombre de clase no funciona: lleva a texto negro sobre negro en
   un sitio y blanco sobre blanco en otro.

   Aquí se abre cada página, se mira qué bloques tienen de verdad un fondo
   oscuro detrás, y se escribe una regla para cada uno con su selector exacto.

   Uso: node generar-fondos.js   (con el sitio servido en localhost:5481) */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5481';
const PAGINAS = ['index.html', 'especialidades.html', 'especialidad.html', 'nosotros.html',
  'contacto.html', 'noticias.html', 'noticia.html', '404.html'];
const SALIDA = path.join(__dirname, '..', 'css', 'fondos-oscuros.css');
const PUERTO = 9390;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const SONDA = `
(() => {
  const aRGB = (s) => { const m=/rgba?\\(([^)]+)\\)/.exec(s); if(!m) return null;
    const p=m[1].split(',').map(parseFloat); return {r:p[0],g:p[1],b:p[2],a:p.length>3?p[3]:1}; };
  const sobre = (f,b) => ({r:f.r*f.a+b.r*(1-f.a), g:f.g*f.a+b.g*(1-f.a), b:f.b*f.a+b.b*(1-f.a), a:1});
  const fondoReal = (el) => { const capas=[]; let n=el;
    while(n && n!==document.documentElement){ const bg=aRGB(getComputedStyle(n).backgroundColor);
      if(bg&&bg.a>0){ capas.push(bg); if(bg.a===1) break; } n=n.parentElement; }
    let base={r:255,g:255,b:255,a:1};
    for(let i=capas.length-1;i>=0;i--) base=sobre(capas[i],base); return base; };
  const lum = (c) => c.r*0.299 + c.g*0.587 + c.b*0.114;

  /* Clases de maquetación: aparecen en todas partes, también sobre fondo
     claro. Si se usaran como selector, una sección clara heredaría el texto
     blanco. Solo valen las clases que identifican un bloque concreto. */
  const GENERICAS = /^(container[\\w-]*|row|col[\\w-]*|d-[\\w-]+|gap-[\\w-]+|overflow-[\\w-]+|position-[\\w-]+|[wh]-[\\w-]+|m[xytleb]?-[\\w-]+|p[xytleb]?-[\\w-]+|justify-[\\w-]+|align-[\\w-]+|text-[\\w-]+|flex-[\\w-]+|swiper[\\w-]*|slick[\\w-]*|effectFade|fade[\\w-]*|active|show|wrapper|inner|content|item|box|h-100|flat-spacing)$/;

  const sel = (el) => {
    const cls = String(el.className || '').trim().split(/\\s+/)
      .filter(c => c && !GENERICAS.test(c))
      .slice(0, 3);
    if (!cls.length) return null;
    return el.tagName.toLowerCase() + '.' + cls.join('.');
  };

  const encontrados = new Set();
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.height < 60) return;
    const f = fondoReal(el);
    if (lum(f) >= 85) return;
    // solo si contiene texto propio o títulos
    if (!el.querySelector('h1,h2,h3,h4,h5,h6,p,li,.title,.text')) return;
    const s = sel(el);
    if (s) encontrados.add(s);
  });
  return [...encontrados];
})()
`;

async function main() {
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--remote-debugging-port=' + PUERTO,
    '--user-data-dir=' + path.join(os.tmpdir(), 'chrome-fondos'), 'about:blank'], { stdio: 'ignore' });
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

  const todos = new Set();
  for (const pg of PAGINAS) {
    await cmd('Page.navigate', { url: BASE + '/' + pg });
    await esperar(6000);
    await cmd('Runtime.evaluate', { expression: "document.querySelectorAll('.effectFade').forEach(e=>{e.style.opacity=1;e.style.visibility='visible';e.style.transform='none';});" });
    await esperar(600);
    const r = await cmd('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    (r.result.value || []).forEach((s) => todos.add(s));
    console.log(pg.padEnd(22), (r.result.value || []).length, 'bloques oscuros');
  }

  const lista = [...todos].sort();
  /* Las cajas claras que pueden vivir dentro de un bloque oscuro */
  const FUERA = ':not(:is(.box-white, .card-especialidad, .features-item, .services-item, '
    + '.widget-box, .form-contact, .adv-booking, .pricing-item:not(.style-black), .card-light) *)';
  const css = `/* GENERADO POR assets/js/generar-fondos.js — no editar a mano.
   Bloques cuyo fondo real es oscuro, medidos sobre las páginas servidas.
   Se regenera con:  node assets/js/generar-fondos.js
   El motivo de que esto exista: el template mezcla secciones oscuras con
   cajas blancas encima, y la misma clase aparece en los dos contextos. Elegir
   el color del texto por el nombre de la clase lleva a negro sobre negro en un
   sitio y blanco sobre blanco en otro. Esto lo decide midiendo. */

/* Un bloque oscuro puede llevar dentro una caja blanca. El texto de dentro de
   esa caja NO va en claro: va en tinta, como cualquier texto sobre blanco.
   De ahí el guardarraíl. */
${lista.map((s) => `${s} :is(.title, h1, h2, h3, h4, h5, h6)${FUERA}`).join(',\n')} {
  color: #ffffff;
}
${lista.map((s) => `${s} :is(p, li, .text, .text-secondary)${FUERA}`).join(',\n')} {
  color: #c3d0dd;
}
${lista.map((s) => `${s} :is(.heading-sub, .sub, .num, .specialty-number)${FUERA}`).join(',\n')} {
  color: #00e5ff;
}
${lista.map((s) => `${s} :is(.adv-chip, .badge-fonasa)${FUERA}`).join(',\n')} {
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.45);
  color: #00e5ff;
}
`;
  fs.writeFileSync(SALIDA, css, 'utf8');
  console.log('\nbloques oscuros distintos:', lista.length);
  console.log('escrito:', SALIDA);

  ws.close(); chrome.kill(); await esperar(400);
}

main().then(() => process.exit(0)).catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
