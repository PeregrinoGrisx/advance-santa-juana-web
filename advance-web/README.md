# Advance · Centro de salud Santa Juana — sitio web

Sitio estático construido por **Punto Gris** sobre el template *Aigocy*, con la
identidad de Advance (turquesa del logotipo) y contenido escrito para el centro.

## Cómo verlo

Es HTML plano: no necesita compilación. Para desarrollo conviene servirlo por
HTTP (los iframes y algunos scripts no funcionan bien abriendo el archivo
directamente):

```bash
npx http-server advance-web -p 5473 -c-1
```

Luego abrir <http://localhost:5473>.

Para publicarlo basta con subir la carpeta completa a cualquier hosting
estático (Netlify, Cloudflare Pages, Vercel, o el hosting actual del dominio).

### Al publicar un cambio

Los CSS y JS propios se enlazan con `?v=` y la fecha
(`brand.css?v=202610181503`). **Hay que subir ese número en las ocho páginas
cada vez que se publique un cambio de estilos o de comportamiento**, o el
navegador y el CDN seguirán sirviendo la copia vieja:

```bash
V=$(date +%Y%m%d%H%M)
cd advance-web && perl -pi -e "s/\?v=\d+/?v=$V/g" *.html
```

## Páginas

| Archivo | Qué es |
|---|---|
| `index.html` | Inicio: hero con reserva, especialidades, motivos de consulta, proceso, equipo, FONASA y valores, FAQ y formulario de reserva |
| `especialidades.html` | Las diez áreas de atención |
| `especialidad.html` | Ficha de una especialidad (ejemplo: medicina general) |
| `nosotros.html` | Propósito, valores, equipo y acreditaciones |
| `contacto.html` | Horarios, datos de contacto, formulario y mapa |
| `noticias.html` | Listado de noticias |
| `noticia.html` | Noticia individual |
| `404.html` | Página no encontrada |

## Estructura

```
advance-web/
├── index.html, nosotros.html, …      páginas
└── assets/
    ├── css/
    │   ├── styles.css                CSS del template, con la paleta ya reemplazada
    │   └── brand.css                 capa propia de Advance (logo, WhatsApp, reserva, accesibilidad)
    ├── js/
    │   ├── main.js                   JS del template (con dos correcciones, ver abajo)
    │   └── advance.js                comportamiento propio (chips de horario, envío a WhatsApp, reloj)
    ├── images/
    │   ├── logo/                     logotipo de Advance e isotipo derivado
    │   ├── section/, team/, blog/    fotografías (provisorias, ver abajo)
    │   ├── item/                     ilustraciones decorativas, recoloreadas a la paleta
    │   └── partner/                  nombres institucionales (FONASA, SEREMI…) en tipografía
    ├── fonts/, icon/
```

## Identidad aplicada

La paleta sale del logotipo del centro y del diagnóstico de Thomas. **No hay
rojo en ninguna parte**: el brief lo descarta explícitamente.

| Color | Hex | Uso |
|---|---|---|
| Turquesa Advance | `#008F96` | color exacto del logotipo; botones, acentos, enlaces |
| Turquesa claro | `#00A3AB` | degradados y estados hover |
| Teal profundo | `#006B70` | fondo de botones y degradados |
| Tinta petróleo | `#0B3D42` | titulares, fondos oscuros |
| Tinta 900 | `#072227` | texto base |
| Agua | `#CFE6E7` | líneas y fondos suaves |
| Nieve | `#EDF5F5` | fondo del sitio |
| Violeta | `#A47CFB` | acento secundario del sistema (ver abajo) |
| Violeta oscuro | `#7C53D6` | texto e iconos sobre fondo claro |
| Celeste | `#8DB9DF` | azul claro de la paleta actual |
| Azul | `#3E689A` | azul de la paleta actual |
| Ámbar FONASA | `#F2B33D` | distintivo de bono FONASA |
| Naranja | `#F7941D` | naranja de la paleta actual, disponible como variante |
| Verde | `#1E7F46` | confirmaciones |

### El violeta como acento

El turquesa manda porque es el logotipo. El violeta `#A47CFB` es el segundo
color del sistema y aparece siempre en los mismos lugares, para que se lea
como decisión y no como adorno suelto:

- el **botón secundario** (`.tf-btn-2`), que está en todos los pares de llamada
  a la acción;
- el **punto de cada antetítulo** de sección (blanco sobre fondo oscuro);
- el resplandor de la **zona oscura** (equipo, cifras, acreditaciones y testimonios);
- las esquinas de **FONASA y valores** y de **Preguntas frecuentes**;
- el **icono del medio** de cada columna de «Todo en un solo lugar», en un
  violeta profundo del mismo peso que el verde azulado;
- el **segundo paso** de «Cómo reservas», dentro de una progresión turquesa →
  violeta → azul.

**El violeta no va en degradados sobre fondo claro.** Ahí se ensucia. Sólo
aparece en elementos sólidos —botones, iconos, puntos, bordes— y como
resplandor sobre el verde oscuro de la zona de equipo y testimonios, donde sí
rinde. En el hero y en la sección de reserva, la zona de color va en ámbar.

### El ámbar es FONASA

`#F2B33D` no decora: marca siempre lo mismo. Aparece en la cinta superior, en
el distintivo del hero, en la tarjeta «Bono FONASA» y en el copago de cada
valor. Si algo no habla del bono, no va en ámbar.

### El hero

En vez del campo plano del template, el hero es un **degradado de malla por
zonas** con grano: base azul claro de la paleta actual, una zona violeta
`#A47CFB` arriba a la derecha y una turquesa `#00A3AB` abajo a la izquierda,
que es la que amarra el fondo con el logotipo.

Detrás de todo corre un **trazado ramificado** (`.adv-circuito`) que sale del
centro hacia los lados, con nodos y un pulso, en la capa de más atrás.

Encima va una **figura recortada** (`assets/images/hero/medica.png`) con un
corte en diagonal en la parte baja del cuerpo, más piezas flotantes: triángulos,
una esfera, un aro punteado y dos tarjetitas de interfaz. La animación del
titular que traía el template no se eliminó: se reubicó junto a la figura
(`.adv-hero__pill`) para dejar sitio a la persona.

La cabecera de Noticias usa el mismo degradado, sin figura.

La sección **«Reserva tu hora»** usa el mismo recurso: campo de color en vez de
fotografía. Sobre la foto de la sala de espera el titular y los datos de
contacto perdían legibilidad.

Las fotos viven donde el template reserva imagen de verdad: especialidades,
motivos de consulta, equipo y noticias.

El template venía con `--brand: #FD3A25` (rojo) y una escala de grises neutra.
Ambas se reemplazaron dentro de `styles.css`, de modo que el diseño, los
espaciados y las animaciones son los del template original: lo único que cambia
es el color, el logotipo y el contenido.

### Logotipo

El logotipo original es vertical (isotipo sobre la palabra «Advance» y bajada
«Centro de salud | Santa Juana»). Para la barra superior y el menú móvil se usa
una **versión horizontal armada por recorte** del mismo archivo
(`assets/images/logo/advance-logo.png`, clases `.adv-logo` en `brand.css`), sin
redibujar nada. El isotipo se vectorizó aparte para el favicon y los badges
(`advance-iso.svg`, `favicon.svg`, `logo-1.svg`, `logo-2.svg`).

> En la etapa de branding conviene entregar un lockup horizontal oficial en SVG
> y reemplazar el recorte por ese archivo.

## Qué falta reemplazar antes de publicar

Todo lo provisorio está marcado en el HTML con un comentario en mayúsculas.
Buscar `DE EJEMPLO`, `REFERENCIALES` y `TEXTO DE EJEMPLO`.

- **Fotografías.** Las de las secciones son de Unsplash (licencia gratuita),
  elegidas para que el sitio se pueda mostrar. Se reemplazan con la sesión de
  fotos del centro, el equipo y Santa Juana prevista en el plan.
- **La figura del hero.** Sale de la imagen que está en `doctora/`, recortada
  con la herramienta de Adobe. Cuando exista la sesión de fotos, se reemplaza
  por una profesional real del centro: basta con dejar el PNG recortado en
  `assets/images/hero/medica.png`, sin tocar nada más.
- **Equipo.** Los nombres de `index.html` y `nosotros.html` son de ejemplo.
  Deben ir los profesionales reales con su número de registro en la
  Superintendencia de Salud.
- **Valores y copagos.** Los montos de la sección «FONASA y valores» son
  referenciales. Hay que confirmarlos con el centro.
- **Horarios.** Los de `contacto.html` son una propuesta; confirmar.
- **Testimonios.** Son textos de ejemplo. Reemplazar por reseñas reales del
  perfil de Google una vez activo.
- **Noticias.** Los seis artículos son títulos de ejemplo; solo el de FONASA
  está desarrollado.
- **Logos institucionales.** FONASA, SEREMI, MINSAL y Superintendencia aparecen
  como nombres en tipografía, no como logotipos oficiales. Si se quiere usar el
  logotipo real hay que pedir autorización a cada institución.

## Lo que todavía no está conectado

El formulario de reserva **no tiene backend**. Mientras no exista, al enviarlo
se abre WhatsApp con los datos ya escritos, para no perder la solicitud
(`assets/js/advance.js`). Los pasos siguientes son:

1. Conectar la reserva a la agenda real (MACA o la herramienta que se elija),
   para que muestre horas disponibles de verdad.
2. Conectar WhatsApp Business con recordatorios automáticos.
3. Montar el formulario sobre un servicio de correo o CRM, con el destinatario
   correcto (**hoy el correo de la web antigua llega a otro centro**).

## Correcciones hechas sobre el template

- `main.js`: el contador lanzaba un `TypeError` en cada evento de scroll en las
  páginas sin `.counter`. Ahora está protegido.
- `main.js`: el cambio de precios se formatea en pesos chilenos y alterna entre
  «copago FONASA» y «particular» en vez de «year» / «month».
- `brand.css`: se corrigió el degradado `text-gradient-2`, que dejaba la última
  línea de los titulares casi invisible; se ampliaron el encabezado y los
  tamaños de cifras para los textos en español; y se habilitó el zoom
  (el sitio actual lo bloquea con `maximum-scale=1`).
