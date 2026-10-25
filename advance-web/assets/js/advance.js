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

    /* Desplegable de «¿Qué necesitas?»: lista propia sobre el <select> */
    document.querySelectorAll('.adv-booking select').forEach(function (sel) {
        var caja = document.createElement('div');
        caja.className = 'adv-sel';
        sel.parentNode.insertBefore(caja, sel);
        caja.appendChild(sel);
        sel.tabIndex = -1;
        sel.setAttribute('aria-hidden', 'true');

        var boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'adv-sel__btn';
        boton.setAttribute('aria-haspopup', 'listbox');
        boton.setAttribute('aria-expanded', 'false');
        var lista = document.createElement('ul');
        lista.className = 'adv-sel__list';
        lista.setAttribute('role', 'listbox');
        caja.insertBefore(boton, sel);
        caja.insertBefore(lista, sel);

        var items = Array.prototype.map.call(sel.options, function (op, i) {
            var li = document.createElement('li');
            li.className = 'adv-sel__opt';
            li.setAttribute('role', 'option');
            li.textContent = op.textContent;
            li.addEventListener('mousedown', function (e) { e.preventDefault(); elegir(i); });
            lista.appendChild(li);
            return li;
        });
        var activo = -1;

        function pintar() {
            boton.textContent = sel.options[sel.selectedIndex].textContent;
            items.forEach(function (li, i) {
                li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
                li.classList.toggle('is-active', i === activo);
            });
        }
        function abrir() {
            caja.classList.add('is-open');
            boton.setAttribute('aria-expanded', 'true');
            activo = -1;
            pintar();
        }
        function cerrar() {
            caja.classList.remove('is-open');
            boton.setAttribute('aria-expanded', 'false');
            activo = -1;
            pintar();
        }
        function elegir(i) {
            sel.selectedIndex = i;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            cerrar();
            boton.focus();
        }
        boton.addEventListener('click', function () {
            caja.classList.contains('is-open') ? cerrar() : abrir();
        });
        boton.addEventListener('keydown', function (e) {
            var abierto = caja.classList.contains('is-open');
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!abierto) { abrir(); return; }
                if (activo < 0) activo = sel.selectedIndex;
                activo = Math.max(0, Math.min(items.length - 1, activo + (e.key === 'ArrowDown' ? 1 : -1)));
                pintar();
                items[activo].scrollIntoView({ block: 'nearest' });
            } else if ((e.key === 'Enter' || e.key === ' ') && abierto) {
                e.preventDefault();
                elegir(activo < 0 ? sel.selectedIndex : activo);
            } else if (e.key === 'Escape' || e.key === 'Tab') {
                if (abierto) cerrar();
            }
        });
        document.addEventListener('mousedown', function (e) {
            if (!caja.contains(e.target)) cerrar();
        });
        sel.addEventListener('invalid', function () { boton.focus(); });
        pintar();
    });

    /* Menú fijo al hacer scroll */
    var cabecera = document.querySelector('.tf-header');
    if (cabecera) {
        var fijarCabecera = function () {
            cabecera.classList.toggle('adv-fijo', window.scrollY > 60);
        };
        fijarCabecera();
        window.addEventListener('scroll', fijarCabecera, { passive: true });
    }

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
