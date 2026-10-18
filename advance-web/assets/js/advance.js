/* Advance · Centro de salud Santa Juana
   Comportamientos propios del sitio, aparte del template. Punto Gris. */

(function () {
    'use strict';

    /* Chips de preferencia horaria en el formulario de reserva */
    document.querySelectorAll('.adv-chips').forEach(function (group) {
        group.addEventListener('click', function (e) {
            var chip = e.target.closest('.adv-chip');
            if (!chip) return;
            group.querySelectorAll('.adv-chip').forEach(function (c) {
                c.classList.remove('is-active');
            });
            chip.classList.add('is-active');
        });
    });

    /* El formulario todavía no tiene backend: se deriva a WhatsApp con los
       datos ya escritos, para no perder la solicitud del paciente. */
    var form = document.querySelector('.adv-booking');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var area = form.querySelector('[name="area"]');
            var cuando = form.querySelector('.adv-chip.is-active');
            var nombre = form.querySelector('[name="nombre"]');
            var fono = form.querySelector('[name="telefono"]');
            var msg = form.querySelector('[name="mensaje"]');

            var texto = 'Hola, quiero reservar una hora en Advance Santa Juana.'
                + '\n\nÁrea: ' + ((area && area.value) || 'por definir')
                + '\nCuándo: ' + ((cuando && cuando.textContent.trim()) || 'por definir')
                + '\nNombre: ' + ((nombre && nombre.value) || '')
                + '\nTeléfono: ' + ((fono && fono.value) || '');

            if (msg && msg.value.trim()) {
                texto += '\nMotivo: ' + msg.value.trim();
            }

            window.open('https://wa.me/56942934776?text=' + encodeURIComponent(texto), '_blank', 'noopener');
        });
    }

    /* Red de seguridad: el effectFade del template depende de GSAP + ScrollTrigger
       y a veces no llega a dispararse para los elementos que ya están en pantalla
       al cargar. Pasados dos segundos, se revela lo que siga invisible dentro del
       primer viewport: más vale perder la animación que perder el contenido. */
    setTimeout(function () {
        document.querySelectorAll('.effectFade').forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.top > window.innerHeight || r.bottom < 0) return;
            var cs = window.getComputedStyle(el);
            if (parseFloat(cs.opacity) > 0.05 && cs.visibility !== 'hidden') return;
            el.style.opacity = '1';
            el.style.visibility = 'visible';
            el.style.transform = 'none';
        });
    }, 2000);

    /* Menú fijo al hacer scroll */
    var cabecera = document.querySelector('.tf-header');
    if (cabecera) {
        var fijarCabecera = function () {
            cabecera.classList.toggle('adv-fijo', window.scrollY > 60);
        };
        fijarCabecera();
        window.addEventListener('scroll', fijarCabecera, { passive: true });
    }

    /* Navegación por secciones: en vez de hacer scroll, saltar de bloque en
       bloque. Reemplaza al botón de «volver arriba» del template, que sólo
       subía hasta el principio. */
    (function () {
        var principal = document.querySelector('#wrapper');
        if (!principal) return;

        var secciones = function () {
            var sel = '.section-hero, .section-page-title, .section-about-us, .section-partner,'
                + ' .section-services, .section-services-single, .section-featured-works,'
                + ' .section-process, .section-benefits, .section-features, .section-tools,'
                + ' .section-team, .section-statistic, .section-awards, .section-testimonials,'
                + ' .section-pricing, .section-faqs, .section-contact, .section-blog, .section-404, footer';
            return [].slice.call(document.querySelectorAll(sel))
                .filter(function (el) { return el.offsetHeight > 120; });
        };

        var nav = document.createElement('div');
        nav.className = 'adv-nav';
        nav.innerHTML =
            '<button type="button" class="adv-nav__btn" data-dir="-1" aria-label="Sección anterior">'
            + '<span class="border-progress"></span>'
            + '<i class="icon icon-angle-up-solid" aria-hidden="true"></i></button>'
            + '<button type="button" class="adv-nav__btn" data-dir="1" aria-label="Sección siguiente">'
            + '<i class="icon icon-angle-down-solid" aria-hidden="true"></i></button>';
        document.body.appendChild(nav);

        var irA = function (dir) {
            var lista = secciones();
            var y = window.scrollY;
            var destino = null;
            if (dir > 0) {
                for (var i = 0; i < lista.length; i++) {
                    var t = lista[i].getBoundingClientRect().top + y;
                    if (t > y + 12) { destino = t; break; }
                }
                if (destino === null) destino = document.body.scrollHeight;
            } else {
                for (var j = lista.length - 1; j >= 0; j--) {
                    var u = lista[j].getBoundingClientRect().top + y;
                    if (u < y - 12) { destino = u; break; }
                }
                if (destino === null) destino = 0;
            }
            animar(Math.max(0, destino - 8));
        };

        /* El template carga una librería de scroll suave que intercepta
           window.scrollTo, así que el desplazamiento se anima a mano. */
        var animando = null;
        var respaldo = null;
        var ponerScroll = function (y) {
            document.documentElement.scrollTop = y;
            document.body.scrollTop = y;
        };
        var animar = function (destino) {
            if (animando) cancelAnimationFrame(animando);
            if (respaldo) clearTimeout(respaldo);
            var inicio = document.documentElement.scrollTop;
            var distancia = destino - inicio;
            if (!distancia) return;
            var t0 = null;
            var corrio = false;
            var dur = Math.min(620, Math.max(260, Math.abs(distancia) * 0.45));
            var paso = function (t) {
                corrio = true;
                if (t0 === null) t0 = t;
                var p = Math.min(1, (t - t0) / dur);
                var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
                ponerScroll(inicio + distancia * e);
                if (p < 1) animando = requestAnimationFrame(paso);
                else animando = null;
            };
            animando = requestAnimationFrame(paso);
            // Si la pestaña no está pintando, rAF no se dispara: se salta sin animar.
            respaldo = setTimeout(function () {
                if (!corrio) {
                    if (animando) cancelAnimationFrame(animando);
                    animando = null;
                    ponerScroll(destino);
                    if (Math.abs(document.documentElement.scrollTop - destino) > 4) window.scrollTo(0, destino);
                }
            }, 140);
        };

        nav.addEventListener('click', function (e) {
            var b = e.target.closest('.adv-nav__btn');
            if (b) irA(Number(b.dataset.dir));
        });

        var estado = function () {
            nav.classList.toggle('is-arriba', window.scrollY < 40);
        };
        estado();
        window.addEventListener('scroll', estado, { passive: true });
    })();

    /* Reloj de la cabecera del menú móvil, en hora de Chile continental */
    var clock = document.querySelector('.clock');
    if (clock) {
        var tick = function () {
            clock.textContent = new Date().toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Santiago'
            });
        };
        tick();
        setInterval(tick, 30000);
    }
})();
