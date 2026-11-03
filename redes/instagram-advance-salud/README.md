# Posts de Instagram · Advance Salud | Santa Juana

Seis posts en el estilo de la sección «Redes sociales» del **Manual de Marca de
Advance Salud** (agencia Merken Digital), listos para publicar y editables.
Formato vertical 1080 × 1350 (4:5), el que más espacio ocupa en el feed.

| Archivo | Qué es |
|---|---|
| `01-agenda-tu-consulta` | Fondo azul, palabra destacada en manuscrita, lista de especialidades en píldoras y sello de bono FONASA |
| `02-bienestar-familia` | Fondo blanco con líneas orgánicas, foto con borde ondulado y tres atributos de la marca |
| `03-kinesiologia` a `06-toma-de-muestras` | Una especialidad por post: foto con velo azul, tarjeta de vidrio, ícono en verde lima y contacto |

Cada post tiene su `.html` editable y su `.png` exportado en `png/`.

## La marca que se usa

- **Logotipo:** archivos maestros del kit oficial (`logos/`), sin redibujar ni
  recolorear, como exige el manual. Solo se recortó el margen transparente del
  lienzo de 1080 × 1080.
- **Colores:** azul `#044B7E` (principal), verde lima `#9FD412` y celeste
  `#6DB9E6` (secundarios), verde agua `#48A9A6` y azul noche `#012A47` (apoyo).
- **Tipografías:** Nunito Sans (principal), DM Sans (complementaria) y
  *Common Rejection* para la palabra destacada. Como *Common Rejection* no está
  en Google Fonts, se usa **Satisfy** como reemplazo; si se instala la original
  en el computador, la exportación la toma sola.
- **Íconos:** de línea dentro de círculos de color, como la iconografía
  institucional del manual (Tabler Icons, licencia MIT).

### Diferencias con las piezas del manual

- En las píldoras celeste, lima y verde agua el texto va en **azul noche** y no en
  blanco: el blanco sobre esos colores no llega al contraste mínimo de lectura
  (1,8:1 a 2,8:1), y buena parte del público son personas mayores.
- Se corrigió «Agenta tu consulta» por **«Agenda tu consulta»**.
- Se agregó el sello **«Atendemos con bono FONASA»**, el principal argumento del centro.

## Antes de publicar

- **Fotos:** las de `fotos/` son de banco (Unsplash, uso libre) y vienen de la
  web. Reemplazarlas por fotos del centro y del equipo, con consentimiento
  escrito (Ley 20.584). Basta con dejar el archivo nuevo con el mismo nombre.
- **Faltan posts de** Matrona, Psicología, Fonoaudiología, Nutrición, Enfermería
  y Podología: no hay fotos con suficiente resolución. Con la sesión de fotos se
  duplica `03-kinesiologia.html` y se cambian nombre, bajada, ícono y foto.

## Editar y exportar

1. Abre el `.html` en un editor de texto y cambia los textos.
2. Exporta todo a `png/`:

   ```bash
   python redes/instagram-advance-salud/exportar.py
   ```

## Textos sugeridos para publicar

**01 · Agenda tu consulta.** Medicina general, odontología, kinesiología,
psicología y toma de muestras, aquí en Santa Juana. Atendemos con bono FONASA.
Agenda por WhatsApp al +56 9 4293 4776 · Villagrán 199.
`#SantaJuana #AdvanceSalud #SaludFamiliar #FONASA`

**02 · Bienestar para tu familia.** Cuidar tu salud también es cuidar a quienes
más quieres. Especialistas, atención cercana y cuidado integral sin viajar a
Concepción. Escríbenos al +56 9 4293 4776.

**03 · Kinesiología.** ¿Dolor de espalda, una lesión o recuperándote de una
operación? Rehabilitación y gimnasio terapéutico en Villagrán 199. Agenda al
+56 9 4293 4776.

**04 · Odontología.** Prevención y tratamientos para toda la familia. Agenda tu
hora por WhatsApp al +56 9 4293 4776.

**05 · Medicina general.** Atención para niños, adultos y personas mayores, con
bono FONASA. Agenda al +56 9 4293 4776.

**06 · Toma de muestras.** Tus exámenes de laboratorio en Santa Juana, sin
viajar. Si son en ayuno, pide hora temprano. +56 9 4293 4776.
