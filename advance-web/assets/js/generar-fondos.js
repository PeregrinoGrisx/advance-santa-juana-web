/* Genera assets/css/fondos-oscuros.css midiendo el fondo REAL de cada bloque.

   El template mezcla secciones oscuras con cajas blancas encima, y la misma
   clase (.text-white, .title, .adv-chip…) aparece en los dos contextos. Por eso
   adivinar por nombre de clase no funciona: lleva a texto negro sobre negro en
   un sitio y blanco sobre blanco en otro.

   Aquí se abre cada página, se mira qué bloques tienen de verdad un fondo
   oscuro detrás, y se escribe una regla para cada uno con su selector exacto.

   Uso: node generar-fondos.js            (con el sitio servido)
        DEBUG=1 node generar-fondos.js    (dice qué marca cada bloque y con qué
                                           luminancia)

   El modo DEBUG existe por experiencia propia: cuando un bloque claro acaba
   con el texto en blanco, lo que hace falta saber es qué luminancia midió y en
   qué elemento, no volver a adivinar. */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5473';
const PAGINAS = ['index.html', 'especialidades.html', 'especialidad.html', 'nosotros.html',
  'contacto.html', 'noticias.html', 'noticia.html', '404.html'];
const SALIDA = path.join(__dirname, '..', 'css', 'fondos-oscuros.css');
const PUERTO = 9390;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/* String.raw: la sonda va llena de expresiones regulares y una barra invertida
   perdida aquí no da error, solo cambia en silencio lo que mide. Ya pasó:
   /rgba?\(([^)]+)\)/ se quedó en /rgba?(([^)]+))/, que captura el paréntesis
   de apertura, parseFloat("(0") devuelve NaN, y como NaN >= 85 es false, los
   bloques claros se colaban en la lista de oscuros. */
const SONDA = String.raw`
(() => {
  const aRGB = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const sobre = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  });

  /* Un degradado también es fondo, y se aproxima por la media de sus paradas.
     No es exacto, pero para decidir si un bloque es oscuro o claro basta, y es
     la misma cuenta que hace auditar-contraste.js: conviene que las dos midan
     igual, porque una decide los colores y la otra los aprueba.

     Tres condiciones, las tres aprendidas a golpes:

     - Se descartan las paradas casi transparentes. Sin eso, un degradado que
       va de un color a «ese mismo color con alfa 0» se promediaba con el
       transparente y salía más claro de lo que se ve.

     - El degradado solo cuenta como fondo si alguna parada es opaca. El
       template usa degradados casi invisibles como brillo decorativo encima de
       botones, iconos y titulillos: radial-gradient(… rgba(255,255,255,.2) …).
       Eso no es el fondo. Si se toma por fondo, la medición se detiene ahí y
       devuelve casi blanco, tapando el color real que hay debajo.

     - Y si alguna parada no se pudo leer, no se devuelve un número a medias.
       Un NaN se propaga hasta lum(), y «NaN >= 85» es false, así que el bloque
       se escapaba del filtro de «es claro, sáltalo» y acababa en la lista. */
  const deGradiente = (bi) => {
    if (!bi || bi === 'none' || !/gradient/.test(bi)) return null;
    const paradas = [...bi.matchAll(/rgba?\(([^)]+)\)/g)]
      .map((m) => m[1].split(',').map((x) => parseFloat(x)))
      .filter((c) => c.length < 4 || c[3] > 0.25);
    if (!paradas.length) return null;
    if (!paradas.some((c) => c.length < 4 || c[3] >= 0.9)) return null;
    if (paradas.some((c) => c.slice(0, 3).some((v) => !isFinite(v)))) return null;
    const n = paradas.length;
    return {
      r: paradas.reduce((a, c) => a + c[0], 0) / n,
      g: paradas.reduce((a, c) => a + c[1], 0) / n,
      b: paradas.reduce((a, c) => a + c[2], 0) / n,
      a: 1,
    };
  };

  /* Un fondo recortado al texto (background-clip: text) no pinta fondo: pinta
     las letras. Si se cuenta, un titular con degradado se toma a sí mismo por
     fondo y entra en la lista de bloques oscuros sin serlo. */
  const recortadoAlTexto = (cs) =>
    /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')
    || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)';

  /* El fondo real: se sube por los padres acumulando capas translúcidas */
  const fondoReal = (el) => {
    const capas = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (recortadoAlTexto(cs)) { n = n.parentElement; continue; }
      const gr = deGradiente(cs.backgroundImage);
      if (gr) { capas.push(gr); break; }
      const bg = aRGB(cs.backgroundColor);
      if (bg && bg.a > 0) { capas.push(bg); if (bg.a === 1) break; }
      n = n.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) base = sobre(capas[i], base);
    return base;
  };

  const lum = (c) => c.r * 0.299 + c.g * 0.587 + c.b * 0.114;

  /* Clases de maquetación: aparecen en todas partes, también sobre fondo
     claro. Si se usaran como selector, una sección clara heredaría el texto
     blanco. Solo valen las clases que identifican un bloque concreto. */
  const GENERICAS = /^(container[\w-]*|row|col[\w-]*|d-[\w-]+|gap-[\w-]+|overflow-[\w-]+|position-[\w-]+|[wh]-[\w-]+|m[xytleb]?-[\w-]+|p[xytleb]?-[\w-]+|justify-[\w-]+|align-[\w-]+|text-[\w-]+|flex-[\w-]+|swiper[\w-]*|slick[\w-]*|effectFade|fade[\w-]*|active|show|wrapper|inner|content|item|box|z-\d+|heading|h-100|flat-spacing)$/;

  /* El selector lleva delante el id más cercano cuando lo hay. Hace falta:
     .section-contact es oscura en la portada, dentro de #reservar, y clara en
     contacto.html, donde la misma clase envuelve tarjetas blancas. Sin el id,
     una sola regla gobernaría las dos y una de las dos saldría ilegible. */
  const sel = (el) => {
    const cls = String(el.className || '').trim().split(/\s+/)
      .filter((c) => c && !GENERICAS.test(c))
      .slice(0, 3);
    if (!cls.length) return null;
    const propio = el.tagName.toLowerCase() + '.' + cls.join('.');
    let n = el;
    while (n && n !== document.body) {
      if (n.id) return '#' + n.id + (n === el ? '' : ' ' + propio);
      n = n.parentElement;
    }
    return propio;
  };

  const encontrados = new Set();
  const porQue = [];
  document.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 140 || r.height < 60) return;

    /* Solo cuenta el bloque que PINTA el fondo oscuro, no los que lo heredan.
       Sin esta condición entraban clases de maquetación (.heading, .lg-mb-24,
       .z-5, .contact-item) por estar dentro de una sección oscura, y su
       selector las habría pintado de blanco también donde el fondo es claro.
       El texto de dentro ya recibe el color por el selector de descendencia. */
    const cs = getComputedStyle(el);
    if (recortadoAlTexto(cs)) return;
    const propio = deGradiente(cs.backgroundImage) || aRGB(cs.backgroundColor);
    if (!propio || propio.a < 0.5) return;

    const f = fondoReal(el);
    const l = lum(f);
    if (!isFinite(l) || l >= 85) return;
    // solo si contiene texto propio o títulos
    if (!el.querySelector('h1,h2,h3,h4,h5,h6,p,li,.title,.text')) return;
    const s = sel(el);
    if (!s) return;
    encontrados.add(s);
    porQue.push(s.padEnd(40) + 'lum=' + Math.round(l));
  });
  return { bloques: [...encontrados], porQue };
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
    /* Las animaciones de entrada dejan los bloques a opacidad 0; así no se
       mide un fondo que todavía no está puesto. */
    await cmd('Runtime.evaluate', { expression: "document.querySelectorAll('.effectFade').forEach(e=>{e.style.opacity=1;e.style.visibility='visible';e.style.transform='none';});" });
    await esperar(600);
    const r = await cmd('Runtime.evaluate', { expression: SONDA, returnByValue: true });
    const v = r.result.value || { bloques: [], porQue: [] };
    v.bloques.forEach((s) => todos.add(s));
    console.log(pg.padEnd(22), v.bloques.length, 'bloques oscuros');
    if (process.env.DEBUG) v.porQue.forEach((l) => console.log('      ' + l));
  }

  const lista = [...todos].sort();
  /* Las cajas claras que pueden vivir dentro de un bloque oscuro */
  const FUERA = ':not(:is(.box-white, .card-especialidad, .features-item, .services-item, '
    + '.widget-box, .form-contact, .adv-booking, .box-contact-item, '
    + '.pricing-item:not(.style-black), .card-light) *)';
  const css = `/* GENERADO POR assets/js/generar-fondos.js — no editar a mano.
   Bloques cuyo fondo real es oscuro, medidos sobre las páginas servidas.
   Se regenera con:  node assets/js/generar-fondos.js

   El motivo de que esto exista: el template mezcla secciones oscuras con
   cajas blancas encima, y la misma clase aparece en los dos contextos. Elegir
   el color del texto por el nombre de la clase lleva a negro sobre negro en un
   sitio y blanco sobre blanco en otro. Esto lo decide midiendo.

   Para comprobarlo:  node assets/js/auditar.js   (debe dar 0 fallos) */

/* Un bloque oscuro puede llevar dentro una caja blanca. El texto de dentro de
   esa caja NO va en claro: va en tinta, como cualquier texto sobre blanco.
   De ahí el guardarraíl. */
${lista.map((s) => `${s} :is(.title, h1, h2, h3, h4, h5, h6)${FUERA}`).join(',\n')} {
  color: #ffffff;
}
${lista.map((s) => `${s} :is(p, li, .text, .text-secondary)${FUERA}`).join(',\n')} {
  color: #c3d0dd;
}
${lista.map((s) => `${s} :is(.sub, .num, .specialty-number)${FUERA}`).join(',\n')} {
  color: #00e5ff;
}

/* El titulillo .heading-sub no es texto suelto: el template lo dibuja como
   una pastilla con fondo propio, y ese fondo lo expresa como un degradado de
   un solo color —linear-gradient(0deg, #f5f7fa, #f5f7fa)—, asi que es un
   fondo opaco de verdad, no un adorno. Dentro de un bloque oscuro quedaba una
   pastilla casi blanca con la letra cian encima: 1,43:1, ilegible. Se le
   cambia el relleno por cian translucido, como a los .adv-chip. */
${lista.map((s) => `${s} .heading-sub${FUERA}`).join(',\n')} {
  background: rgba(0, 229, 255, 0.12) !important;
  color: #00e5ff;
}

/* El degradado de marca, en su registro oscuro.

   Es el mismo par de siempre, celeste y morado, pero cada fondo admite un
   tramo distinto. Sobre claro hay que bajar el celeste o no se lee; sobre
   oscuro pasa al reves: el celeste luce a plena potencia y el que se apaga es
   el morado, que sobre azul noche se hunde (2,7:1). Asi que aqui el celeste
   sube a #00e5ff y el morado se aclara a #8f6bff, que da 3,8:1.

   Un degradado solo es tan legible como su extremo mas flojo: en ese extremo
   tambien hay letras. */
${lista.map((s) => `${s} :is(.text-gradient, .text-gradient-1, .text-gradient-2, .text-gradient-3)${FUERA}`).join(',\n')} {
  background: linear-gradient(100deg, #00e5ff 0%, #8f6bff 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  color: transparent !important;
}
${lista.map((s) => `${s} :is(.adv-chip, .badge-fonasa)${FUERA}`).join(',\n')} {
  background: rgba(0, 229, 255, 0.12);
  border: 1px solid rgba(0, 229, 255, 0.45);
  color: #00e5ff;
}
`;
  fs.writeFileSync(SALIDA, css, 'utf8');
  console.log('\nbloques oscuros distintos:', lista.length);
  lista.forEach((s) => console.log('   ' + s));
  console.log('escrito:', SALIDA);

  ws.close(); chrome.kill(); await esperar(400);
}

main().then(() => process.exit(0)).catch((e) => { console.error('FALLO:', e.message); process.exit(1); });
