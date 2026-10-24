/* Auditor de contraste.
   Recorre cada texto visible de la página, busca el fondo que de verdad tiene
   detrás —subiendo por los padres hasta encontrar uno opaco— y calcula la
   razón de contraste de la norma WCAG.

   Umbral: 4,5:1 para texto normal y 3:1 para texto grande (24 px, o 18,7 px en
   negrita). Es el mínimo para que una persona con vista cansada pueda leer, y
   en Santa Juana uno de cada cuatro habitantes tiene 60 años o más.

   Se pega en la consola del navegador o se ejecuta con auditar.js.
   Devuelve la lista de fallos, del peor al menos malo. */
(function () {
  const aRGB = (s) => {
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  /* Mezcla un color con alfa sobre el que tiene detrás */
  const sobre = (frente, fondo) => ({
    r: frente.r * frente.a + fondo.r * (1 - frente.a),
    g: frente.g * frente.a + fondo.g * (1 - frente.a),
    b: frente.b * frente.a + fondo.b * (1 - frente.a),
    a: 1,
  });

  const luminancia = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };

  const razon = (a, b) => {
    const la = luminancia(a), lb = luminancia(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /* Un degradado también es fondo. Se aproxima por la media de sus paradas:
     no es exacto, pero distingue un bloque oscuro de uno claro, que es lo que
     hace falta. Sin esto, cualquier caja con degradado se leía como
     transparente y el resultado eran falsos positivos. */
  const deGradiente = (bi) => {
    if (!bi || bi === 'none' || !/gradient/.test(bi)) return null;
    const paradas = [...bi.matchAll(/rgba?\(([^)]+)\)/g)]
      .map((m) => m[1].split(',').map(parseFloat))
      .filter((p) => p.length < 4 || p[3] > 0.25);
    /* El template usa degradados casi transparentes como brillo decorativo
       —radial-gradient(… rgba(255,255,255,.2) …)— encima de botones, iconos y
       titulillos. Eso no es el fondo: si se toma por fondo, la medición se
       detiene ahí y devuelve casi blanco, tapando el color real que hay
       debajo. Un degradado solo cuenta como fondo si tapa de verdad, es decir
       si alguna de sus paradas es opaca. */
    if (!paradas.length) return null;
    if (!paradas.some((p) => p.length < 4 || p[3] >= 0.9)) return null;
    /* Y si alguna parada no se pudo leer, no se devuelve un numero a medias:
       un NaN se propaga hasta el calculo de contraste y da comparaciones que
       siempre son falsas, asi que el fallo pasaria inadvertido. */
    if (paradas.some((p) => p.slice(0, 3).some((v) => !isFinite(v)))) return null;
    const n = paradas.length;
    return {
      r: paradas.reduce((a, p) => a + p[0], 0) / n,
      g: paradas.reduce((a, p) => a + p[1], 0) / n,
      b: paradas.reduce((a, p) => a + p[2], 0) / n,
      a: 1,
    };
  };

  /* Un fondo recortado al texto (background-clip: text) no pinta fondo: pinta
     las letras. Tomarlo por fondo hace que un titular con degradado se mida
     contra sí mismo y dé siempre el mismo número, pase lo que pase detrás. */
  const recortadoAlTexto = (cs) =>
    /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')
    || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)';

  /* El fondo real: se suben los padres acumulando capas translúcidas */
  const fondoReal = (el) => {
    const capas = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      if (recortadoAlTexto(cs)) { n = n.parentElement; continue; }
      const grad = deGradiente(cs.backgroundImage);
      if (grad) { capas.push(grad); break; }
      const bg = aRGB(cs.backgroundColor);
      if (bg && bg.a > 0) { capas.push(bg); if (bg.a === 1) break; }
      n = n.parentElement;
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = capas.length - 1; i >= 0; i--) base = sobre(capas[i], base);
    return base;
  };

  const fallos = [];
  const vistos = new Set();

  document.querySelectorAll('body *').forEach((el) => {
    // solo elementos con texto propio
    const propio = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!propio) return;

    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.opacity) < 0.15) return;

    const col = aRGB(cs.color);
    if (!col) return;

    /* Los titulares con degradado llevan el color transparente a propósito: lo
       que se ve es el degradado recortado sobre la letra, no el color. Medir
       ese transparente da 1:1, un falso positivo.

       Antes se saltaban, y así el texto más grande del sitio —el titular del
       hero— era justo el único que nadie medía. Ahora se mide cada parada del
       degradado contra el fondo y se guarda la PEOR: un degradado solo es tan
       legible como su extremo más flojo, porque ahí hay letras igual. */
    const recortado = col.a === 0 && recortadoAlTexto(cs);

    const fondo = fondoReal(el);
    let ratio;
    if (recortado) {
      const paradas = [...(cs.backgroundImage || '').matchAll(/rgba?\(([^)]+)\)/g)]
        .map((m) => m[1].split(',').map((x) => parseFloat(x)))
        .filter((p) => (p.length < 4 || p[3] > 0.5) && p.slice(0, 3).every((v) => isFinite(v)));
      if (!paradas.length) return;
      ratio = Math.min(...paradas.map((p) => razon(
        sobre({ r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }, fondo), fondo)));
    } else {
      ratio = razon(sobre(col, fondo), fondo);
    }

    const tam = parseFloat(cs.fontSize);
    const negrita = parseInt(cs.fontWeight, 10) >= 700;
    const grande = tam >= 24 || (tam >= 18.66 && negrita);
    const minimo = grande ? 3 : 4.5;

    if (ratio < minimo) {
      const clave = el.tagName + String(el.className) + propio.slice(0, 20);
      if (vistos.has(clave)) return;
      vistos.add(clave);
      fallos.push({
        ratio: Math.round(ratio * 100) / 100,
        minimo,
        texto: propio.slice(0, 46),
        donde: el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''),
        color: cs.color,
        fondo: `rgb(${Math.round(fondo.r)}, ${Math.round(fondo.g)}, ${Math.round(fondo.b)})`,
        tam: Math.round(tam),
      });
    }
  });

  fallos.sort((a, b) => a.ratio - b.ratio);
  return fallos;
})();
