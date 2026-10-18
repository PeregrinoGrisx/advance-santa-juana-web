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
