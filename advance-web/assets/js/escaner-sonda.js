/* LA SONDA DEL ESCÁNER. Se evalúa dentro de la página y devuelve los fallos.
   La ejecuta assets/js/escanear.js sobre las ocho páginas.

   Busca cuatro cosas a la vez, porque las cuatro han aparecido ya en revisión
   y las cuatro se escapan si se miran de a una:

   1. VERDE. Por tono, no por código. Buscar «#008F96» no sirvió: el mismo
      verde volvía escrito como rgba(), dentro de un SVG, o compuesto por una
      transparencia sobre otra cosa. Aquí se mira el color que el navegador
      calcula de verdad y se le saca el tono. Si cae en la franja del verde y
      del verde azulado, se anota, venga de donde venga.

   2. CONTRASTE, TAMBIÉN EN HOVER. El reposo ya lo medía el auditor. Lo que no
      medía nadie es el hover, y ahí estaban las tarjetas que al pasar el ratón
      se ponían oscuras conservando la letra negra.

   3. DESBORDES. Texto o campos que se salen de su caja.

   4. ICONOS. Una caja de icono y su icono con colores demasiado parecidos: el
      dibujo desaparece aunque la caja se vea perfectamente.

   Nada de esto decide nada: solo informa. Lo que se arregla se arregla en el
   CSS, y luego se vuelve a pasar esto hasta que dé cero. */
(function () {
  const F = [];                       // los fallos
  const anota = (tipo, el, detalle) => F.push(Object.assign({
    tipo,
    donde: el.tagName.toLowerCase()
      + (el.id ? '#' + el.id : '')
      + (el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''),
    texto: (el.textContent || '').trim().slice(0, 40),
  }, detalle));

  /* ---------- color ---------- */
  const aRGB = (s) => {
    if (!s) return null;
    const m = /rgba?\(([^)]+)\)/.exec(s);
    if (!m) return null;
    const p = m[1].split(',').map((x) => parseFloat(x));
    if (p.slice(0, 3).some((v) => !isFinite(v))) return null;
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const sobre = (f, b) => ({
    r: f.r * f.a + b.r * (1 - f.a),
    g: f.g * f.a + b.g * (1 - f.a),
    b: f.b * f.a + b.b * (1 - f.a),
    a: 1,
  });

  const hex = (c) => '#' + [c.r, c.g, c.b]
    .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  /* Tono, saturación y luminosidad. El tono es lo que distingue un verde
     azulado de nuestro celeste: están a seis grados, pero son otra cosa. */
  const hsl = (c) => {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const l = (mx + mn) / 2;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return { h, s, l };
  };

  /* LOS CELESTES QUE SÍ SON DE LA PALETA. Todos nacen con el rojo a cero, así
     que todos salen saturados del todo; un celeste «sucio» no es de aquí. */
  const APROBADOS = [
    [0, 229, 255],   // cian eléctrico
    [0, 137, 184],   // celeste profundo, el del degradado sobre claro
    [0, 152, 199],
    [0, 180, 216],
    [0, 113, 143],   // cian de texto
    [0, 109, 153],
    [191, 255, 0],   // lima neón
  ];
  const lejosDeLaPaleta = (c) => APROBADOS.every(([r, g, b]) =>
    Math.sqrt((c.r - r) ** 2 + (c.g - g) ** 2 + (c.b - b) ** 2) > 34);

  /* LA FRANJA SOSPECHOSA. Del verde amarillento al celeste.
     Por el tono solo no basta, y costó entenderlo: el verde azulado sucio del
     template, rgb(46,91,97), está en 187° y nuestro cian en 186°. UN GRADO.
     Lo que de verdad los separa no es el tono sino la pureza: los celestes de
     la paleta llevan el rojo a cero y salen saturados del todo, mientras que
     un verde azulado es ese mismo tono ensuciado. Así que se mira el tono para
     acotar y la distancia a la paleta para decidir.

     Y se mira el color DECLARADO antes de componer: un cian de la paleta al
     12 % sobre azul noche da un color que no está en ninguna lista, y no es un
     error, es el cian haciendo su trabajo. */
  const esVerde = (c, declarado) => {
    if (declarado && !lejosDeLaPaleta(declarado)) return false;
    const { h, s, l } = hsl(c);
    /* El suelo de saturación separa un gris de un verde. Un gris azulado de
       texto como #4f5d66 está en 0,13 y cae en esta franja de tono sin ser
       verde ni de lejos; el verde azulado sucio del template está en 0,36 y
       el de los SVG viejos en 0,33. Con el suelo en 0,12 salían trescientos
       avisos de gris que tapaban los diez que importaban. */
    if (s < 0.22 || l <= 0.08 || l >= 0.86) return false;
    if (h < 86 || h > 205) return false;
    return lejosDeLaPaleta(c);
  };

  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const razon = (a, b) => {
    const la = lum(a), lb = lum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  const recortadoAlTexto = (cs) =>
    /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || '')
    || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)';

  const deGradiente = (bi) => {
    if (!bi || bi === 'none' || !/gradient/.test(bi)) return null;
    const p = [...bi.matchAll(/rgba?\(([^)]+)\)/g)]
      .map((m) => m[1].split(',').map((x) => parseFloat(x)))
      .filter((c) => c.length < 4 || c[3] > 0.25);
    if (!p.length) return null;
    if (!p.some((c) => c.length < 4 || c[3] >= 0.9)) return null;
    if (p.some((c) => c.slice(0, 3).some((v) => !isFinite(v)))) return null;
    const n = p.length;
    return { r: p.reduce((a, c) => a + c[0], 0) / n, g: p.reduce((a, c) => a + c[1], 0) / n,
      b: p.reduce((a, c) => a + c[2], 0) / n, a: 1 };
  };

  const fondoReal = (el) => {
    const capas = []; let n = el;
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

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    if (parseFloat(cs.opacity) < 0.15) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 3 && r.height >= 3;
  };

  const todos = [...document.querySelectorAll('body *')].filter(visible);

  /* ================= 1. VERDE ================= */
  const vistoVerde = new Set();
  todos.forEach((el) => {
    const cs = getComputedStyle(el);
    /* Solo lo que de verdad se ve. caret, outline, column-rule y
       text-decoration heredan de color casi siempre, así que repetían el
       mismo aviso cuatro veces por elemento sin aportar nada.
       Y un borde solo cuenta si tiene grosor: un borde de 0 px no es color. */
    const props = ['color', 'backgroundColor', 'fill', 'stroke'];
    ['Top', 'Right', 'Bottom', 'Left'].forEach((lado) => {
      if (parseFloat(cs['border' + lado + 'Width']) > 0
        && cs['border' + lado + 'Style'] !== 'none') props.push('border' + lado + 'Color');
    });
    props.forEach((p) => {
      const c = aRGB(cs[p]);
      /* Un color casi transparente no se ve, así que no cuenta: lo que importa
         es el color que llega al ojo, compuesto sobre lo que tiene detrás. */
      if (!c || c.a < 0.35) return;
      const real = c.a < 1 ? sobre(c, fondoReal(el)) : c;
      if (!esVerde(real, c)) return;
      const clave = p + hex(real) + el.tagName + String(el.className).slice(0, 30);
      if (vistoVerde.has(clave)) return;
      vistoVerde.add(clave);
      anota('VERDE', el, { prop: p, color: hex(real), tono: Math.round(hsl(real).h) });
    });
    /* Y DENTRO DE LOS SVG ESCRITOS EN EL PROPIO CSS.
       La flecha del desplegable del formulario es un SVG metido en una
       dirección de datos dentro de la regla, y ahí sobrevivió el verde
       azulado viejo a cuatro barridos seguidos: no está escrito como color,
       está escrito como %23008F96 dentro de una cadena de texto. */
    const url = cs.backgroundImage || '';
    if (url.includes('data:image/svg')) {
      [...url.matchAll(/%23([0-9a-fA-F]{6})|#([0-9a-fA-F]{6})/g)].forEach((m) => {
        const h = (m[1] || m[2]).toLowerCase();
        const c = { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
          b: parseInt(h.slice(4, 6), 16), a: 1 };
        if (!esVerde(c, c)) return;
        const clave = 'svgcss' + h + el.tagName + String(el.className).slice(0, 30);
        if (vistoVerde.has(clave)) return;
        vistoVerde.add(clave);
        anota('VERDE', el, { prop: 'svg en el css', color: '#' + h, tono: Math.round(hsl(c).h) });
      });
    }

    /* Los degradados también esconden verde */
    const bi = cs.backgroundImage;
    if (bi && /gradient/.test(bi)) {
      [...bi.matchAll(/rgba?\(([^)]+)\)/g)].forEach((m) => {
        const p = m[1].split(',').map((x) => parseFloat(x));
        if (p.slice(0, 3).some((v) => !isFinite(v))) return;
        const c = { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        if (c.a < 0.35 || !esVerde(c, c)) return;
        const clave = 'grad' + hex(c) + el.tagName + String(el.className).slice(0, 30);
        if (vistoVerde.has(clave)) return;
        vistoVerde.add(clave);
        anota('VERDE', el, { prop: 'degradado', color: hex(c), tono: Math.round(hsl(c).h) });
      });
    }
  });

  /* ================= 2. CONTRASTE EN REPOSO ================= */
  const vistoC = new Set();
  const medirTexto = (el, cs, fondo, estado) => {
    const propio = [...el.childNodes]
      .filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!propio) return;
    const col = aRGB(cs.color);
    if (!col) return;
    let ratio;
    if (col.a === 0 && recortadoAlTexto(cs)) {
      const p = [...(cs.backgroundImage || '').matchAll(/rgba?\(([^)]+)\)/g)]
        .map((m) => m[1].split(',').map((x) => parseFloat(x)))
        .filter((q) => (q.length < 4 || q[3] > 0.5) && q.slice(0, 3).every((v) => isFinite(v)));
      if (!p.length) return;
      ratio = Math.min(...p.map((q) => razon(
        sobre({ r: q[0], g: q[1], b: q[2], a: q.length > 3 ? q[3] : 1 }, fondo), fondo)));
    } else {
      ratio = razon(sobre(col, fondo), fondo);
    }
    const tam = parseFloat(cs.fontSize);
    const grande = tam >= 24 || (tam >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const minimo = grande ? 3 : 4.5;
    if (ratio >= minimo) return;
    const clave = estado + el.tagName + String(el.className) + propio.slice(0, 20);
    if (vistoC.has(clave)) return;
    vistoC.add(clave);
    anota(estado === 'hover' ? 'CONTRASTE-HOVER' : 'CONTRASTE', el, {
      ratio: Math.round(ratio * 100) / 100, minimo,
      color: cs.color, fondo: hex(fondo), tam: Math.round(tam),
    });
  };

  todos.forEach((el) => medirTexto(el, getComputedStyle(el), fondoReal(el), 'reposo'));

  /* ================= 3. CONTRASTE EN HOVER =================
     No se puede pasar el ratón de verdad sobre cada elemento, así que se leen
     las reglas :hover de las hojas de estilo, se busca a quién le tocan y se
     calcula el color que tendría. Es lo que faltaba: una tarjeta que en reposo
     está clara y al pasar el ratón se pone oscura conservando la letra negra
     pasaba la revisión sin que nadie la mirara. */
  const reglasHover = [];
  for (const hoja of document.styleSheets) {
    let rs; try { rs = hoja.cssRules; } catch (e) { continue; }
    /* Ojo con el orden: en Chrome moderno TODA regla tiene .cssRules (una
       lista vacía) porque el CSS ya admite anidamiento, y una lista vacía es
       un objeto, o sea verdadero. Si se pregunta por .cssRules antes que por
       el selector, se entra a recorrer la nada en cada regla y no se mira
       ninguna: el escáner daba cero reglas hover teniendo setenta y ocho solo
       en styles.css. Primero el selector; recorrer, después, y solo si hay
       algo dentro. */
    const recorre = (lista) => {
      for (const r of lista) {
        /* Las reglas que pintan un ::before o un ::after se dejan fuera. Su
           fondo es el de una capa superpuesta, no el del elemento, y al
           quitarle el pseudo al selector se le acababa atribuyendo al enlace
           de debajo: salía «blanco sobre blanco» en un botón que en realidad
           tiene un velo oscuro encima. */
        if (r.selectorText && /::?(before|after)/.test(r.selectorText)) continue;
        if (r.selectorText && /:hover/.test(r.selectorText)) {
          const col = r.style.getPropertyValue('color');
          const bg = r.style.getPropertyValue('background-color')
            || r.style.getPropertyValue('background')
            || r.style.getPropertyValue('background-image');
          if (col || bg) reglasHover.push({ sel: r.selectorText, col, bg });
        }
        if (r.cssRules && r.cssRules.length) recorre(r.cssRules);
      }
    };
    recorre(rs);
  }

  /* Se va elemento por elemento, no regla por regla.
     Mirar cada regla por su cuenta daba falsos positivos de los que engañan:
     el botón de WhatsApp recibe de una regla la letra blanca y de otra el
     fondo violeta. Por separado, la primera parece letra blanca sobre fondo
     claro; juntas son blanco sobre violeta, que se lee perfectamente. Así que
     se juntan todas las reglas de hover que le tocan a un elemento, en el
     orden en que están escritas, y se mide el estado que queda. */
  const vistoH = new Set();
  const conHover = new Map();
  reglasHover.forEach((regla) => {
    const base = regla.sel.replace(/:hover/g, '').replace(/::?(before|after)/g, '').trim();
    if (!base || base === '*') return;
    let elems; try { elems = [...document.querySelectorAll(base)]; } catch (e) { return; }
    elems.filter(visible).slice(0, 8).forEach((el) => {
      if (!conHover.has(el)) conHover.set(el, []);
      conHover.get(el).push(regla);
    });
  });

  conHover.forEach((reglas, el) => {
    /* El último que lo declare manda; es una simplificación de la cascada,
       pero la especificidad real ya la resolvió el navegador en reposo y aquí
       solo se añade lo que cambia al pasar el ratón. */
    let col = null, bg = null, sel = '';
    reglas.forEach((r) => {
      if (r.col) { col = r.col; sel = r.sel; }
      if (r.bg) { bg = r.bg; if (!sel) sel = r.sel; }
    });

    let fondo = null;
    if (bg) fondo = deGradiente(bg) || aRGB(bg);
    if (fondo && fondo.a < 1) fondo = sobre(fondo, fondoReal(el));
    if (!fondo) fondo = fondoReal(el);

    /* La letra puede vivir en el propio elemento o en un hijo */
    const dentro = [el, ...el.querySelectorAll('*')].filter(visible).slice(0, 12);
    dentro.forEach((hijo) => {
      const chs = getComputedStyle(hijo);
      const propio = [...hijo.childNodes]
        .filter((n) => n.nodeType === 3 && n.textContent.trim())
        .map((n) => n.textContent.trim()).join(' ');
      if (!propio) return;
      const colorTexto = col ? (aRGB(col) || aRGB(chs.color)) : aRGB(chs.color);
      if (!colorTexto) return;
      if (colorTexto.a === 0 && recortadoAlTexto(chs)) return;
      const ratio = razon(sobre(colorTexto, fondo), fondo);
      const tam = parseFloat(chs.fontSize);
      const grande = tam >= 24 || (tam >= 18.66 && parseInt(chs.fontWeight, 10) >= 700);
      const minimo = grande ? 3 : 4.5;
      if (ratio >= minimo) return;
      const clave = el.tagName + String(el.className).slice(0, 30) + propio.slice(0, 20);
      if (vistoH.has(clave)) return;
      vistoH.add(clave);
      anota('CONTRASTE-HOVER', hijo, {
        ratio: Math.round(ratio * 100) / 100, minimo, regla: sel.slice(0, 54),
        color: colorTexto.a === 1 ? hex(colorTexto) : (col || chs.color), fondo: hex(fondo),
      });
    });
  });

  /* ================= 4. DESBORDES ================= */
  const vistoD = new Set();
  /* Un carrusel es más ancho que su ventana a propósito: esa es su forma de
     funcionar. Y una fila de Bootstrap con márgenes negativos también se sale
     de su contenedor por diseño. Si no se excluyen, ahogan los desbordes de
     verdad, que son los que parten una caja o sacan un campo del formulario. */
  const PISTA = /swiper|slick|slide|infinite|marquee|scroll|ticker|carousel/i;
  const esPista = (el) => PISTA.test(String(el.className))
    || (el.parentElement && PISTA.test(String(el.parentElement.className)));

  todos.forEach((el) => {
    if (esPista(el)) return;
    const cs = getComputedStyle(el);
    /* Contenido más ancho que la caja, y la caja no deja desplazar: se corta
       o se sale.

       Tres condiciones para no ahogar la lista con cosas que están bien:
       - Más de 10 px. Por debajo son redondeos y canalones de rejilla; un
         desborde que se ve, como el del desplegable del formulario, eran 46.
       - Cajas de cierto tamaño. Un punto de 6 px da 9 de scrollWidth por el
         radio del borde y no significa nada.
       - Y nada con hijos en posición absoluta: el menú desplegable mide 150
         sobre un enlace de 107 porque es un panel flotante, que es justo como
         tiene que ser. scrollWidth los suma igual. */
    /* Y nada que se salga por voladizo intencionado: un hijo en posición
       absoluta o con margen negativo se sale porque alguien lo puso así. En
       el hero, las fichas de «Hora confirmada» cuelgan a propósito del borde
       de la foto, y las líneas decorativas llevan margen de -20 px. Eso no es
       un fallo; el fallo sería que la página se pudiera arrastrar de lado, y
       eso se comprueba aparte, al final, sobre el documento entero. */
    const porVoladizo = () => {
      const borde = el.getBoundingClientRect().right;
      const salientes = [...el.querySelectorAll('*')]
        .filter((h) => h.getBoundingClientRect().right > borde + 1);
      if (!salientes.length) return false;
      /* Si TODOS los que se salen lo hacen por decisión —posición absoluta o
         margen negativo, en ellos o en algún padre dentro de esta caja— no es
         un desborde, es como está dibujado. Basta con que uno se salga sin
         motivo para que el aviso siga en pie. */
      return salientes.every((h) => {
        let n = h;
        while (n && n !== el) {
          const ns = getComputedStyle(n);
          if (ns.position === 'absolute' || ns.position === 'fixed'
            || parseFloat(ns.marginLeft) < 0 || parseFloat(ns.marginRight) < 0) return true;
          n = n.parentElement;
        }
        return false;
      });
    };
    if (cs.overflowX === 'visible' && el.clientWidth >= 40
      && el.scrollWidth > el.clientWidth + 10 && !porVoladizo()) {
      const clave = 'ancho' + el.tagName + String(el.className).slice(0, 30);
      if (!vistoD.has(clave)) {
        vistoD.add(clave);
        anota('DESBORDE', el, { eje: 'ancho', caja: el.clientWidth, contenido: el.scrollWidth });
      }
    }
    /* Y el caso que de verdad se ve: un hijo que se sale de su padre con el
       padre recortando o no. Se mira contra el padre con fondo propio, que es
       el que el ojo lee como «la caja». */
    const padre = el.parentElement;
    if (!padre || padre === document.body) return;
    const pcs = getComputedStyle(padre);
    const tieneCaja = (aRGB(pcs.backgroundColor) || { a: 0 }).a > 0.5
      || /gradient/.test(pcs.backgroundImage || '');
    if (!tieneCaja || pcs.overflow !== 'visible') return;
    const r = el.getBoundingClientRect(), pr = padre.getBoundingClientRect();
    const fuera = Math.max(r.right - pr.right, pr.left - r.left, r.bottom - pr.bottom);
    if (fuera <= 4) return;
    const clave = 'fuera' + el.tagName + String(el.className).slice(0, 30);
    if (vistoD.has(clave)) return;
    vistoD.add(clave);
    anota('DESBORDE', el, { eje: 'fuera de la caja', px: Math.round(fuera),
      padre: padre.tagName.toLowerCase() + '.' + String(padre.className).trim().split(/\s+/).slice(0, 2).join('.') });
  });

  /* LO QUE DE VERDAD IMPORTA DE UN DESBORDE: que la página se pueda arrastrar
     de lado. Un voladizo contenido es una decisión de diseño; una barra de
     desplazamiento horizontal es siempre un fallo, y en el móvil se nota
     mucho más que en pantalla grande. */
  if (document.documentElement.scrollWidth > window.innerWidth + 2) {
    const fuera = [...document.querySelectorAll('body *')].filter((e) => {
      const r = e.getBoundingClientRect();
      const p = getComputedStyle(e).position;
      return r.width > 0 && r.right > window.innerWidth + 2 && p !== 'fixed'
        && !e.closest('[class*="infinite"], [class*="marquee"], .swiper-wrapper, .slick-track');
    });
    anota('SCROLL-LATERAL', document.body, {
      eje: 'la pagina se arrastra de lado',
      px: document.documentElement.scrollWidth - window.innerWidth,
      padre: fuera.length ? (fuera[0].tagName.toLowerCase() + '.'
        + String(fuera[0].className).trim().split(/\s+/).slice(0, 2).join('.')) : 'sin culpable claro',
    });
  }

  /* ================= 5. ICONOS QUE NO SE VEN ================= */
  const vistoI = new Set();
  todos.forEach((el) => {
    const cs = getComputedStyle(el);
    const esIcono = /(^|\s)(icon|fa|bi)(-|\s|$)/.test(String(el.className))
      || el.tagName === 'svg' || el.tagName === 'I';
    if (!esIcono) return;
    /* Un adorno declarado como tal no tiene que cumplir contraste: no lleva
       información, y exigírselo obliga a subir de tono comillas, tramas y
       fondos que están puestos justo para no llamar la atención. El verde sí
       se le sigue mirando, porque un verde es un verde aunque sea un adorno. */
    if (el.closest('[aria-hidden="true"]')) return;
    const col = aRGB(cs.color) || aRGB(cs.fill);
    if (!col || col.a < 0.3) return;
    const fondo = fondoReal(el);
    const ratio = razon(sobre(col, fondo), fondo);
    /* 3:1 es el mínimo de un elemento gráfico que hay que poder distinguir */
    if (ratio >= 3) return;
    const clave = 'ic' + el.tagName + String(el.className).slice(0, 30);
    if (vistoI.has(clave)) return;
    vistoI.add(clave);
    anota('ICONO', el, { ratio: Math.round(ratio * 100) / 100, minimo: 3,
      color: hex(sobre(col, fondo)), fondo: hex(fondo) });
  });

  return F;
})();
