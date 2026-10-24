# Kit de marca básico · Advance, Centro de salud Santa Juana

Todo lo necesario para que cualquier pieza de Advance se vea igual: logotipo
en vectores, colores, tipografía, voz y plantillas listas para redes e impresión.
Preparado por Punto Gris, octubre de 2026.

**Empieza por el [manual de marca](manual-de-marca.pdf)** (10 páginas). Su
versión editable es `manual-de-marca.html`.

## Contenido

| Carpeta / archivo | Qué hay | Para qué |
|---|---|---|
| `logo/svg/` | 16 SVG: vertical, horizontal, horizontal compacto e isotipo, cada uno en turquesa, tinta, blanco y negro | Web, imprenta, señalética: escalan sin perder calidad |
| `logo/png/` | Los mismos 16 en PNG con fondo transparente (2400 px; isotipo 1000 px) | Word, PowerPoint, Canva, WhatsApp |
| `colores/paleta.css` | Variables CSS (`--advance-turquesa`, etc.) | Web |
| `colores/paleta.json` | Nombres, HEX, RGB y uso de cada color | Diseño y desarrollo |
| `plantillas/` | Avatar, portada de Facebook, 3 posts, historia y afiche A4, en HTML editable + PNG/PDF | Redes y comercio local |
| `plantillas/qr-whatsapp.svg` | QR que abre WhatsApp con el mensaje «quiero reservar una hora» | Afiches, tarjetas, mesón |
| `herramientas/exportar.js` | Vuelve a exportar las plantillas y el manual después de editarlos | Mantención |

## Lo esencial

- **Nombre:** Advance · Centro de salud Santa Juana. Nunca «Clínica Advance» ni «Advanced».
- **Frase:** *Tu salud, aquí en Santa Juana.*
- **Colores:** turquesa `#008F96` (el del logo), teal `#006B70` para botones,
  tinta `#0B3D42` para títulos y fondos oscuros, nieve `#EDF5F5` de fondo.
  Ámbar `#F2B33D` **solo** para FONASA y verde `#1E7F46` **solo** para WhatsApp.
  **Sin rojo.** El violeta `#A47CFB` de la vista previa web está en revisión.
- **Tipografía:** Urbanist (gratis en Google Fonts y en Canva). Si no está, Arial.
- **Voz:** de tú, frases cortas, «bono FONASA», «autorizado por la SEREMI» (no «acreditado»).

## El logotipo

Los SVG se vectorizaron desde el logotipo oficial (`advance-web/assets/images/logo/advance-logo.png`):
coinciden en un 99 % con el original píxel a píxel. La palabra y la bajada son
trazados, no texto, así que se ven igual en cualquier computador.

## Editar y exportar plantillas

1. Abre el HTML de la plantilla en un editor y cambia los textos (los rótulos
   «Ejemplo» marcan lo que hay que reemplazar y se borran antes de exportar).
2. Desde la raíz del repositorio:

   ```bash
   npm install puppeteer-core
   node marca/herramientas/exportar.js
   ```

   Usa Edge o Chrome ya instalados y necesita internet para la tipografía.

También se pueden rehacer en Canva con los mismos colores, la tipografía
Urbanist y los PNG del logo.

## Antes de usar en público

- Reemplazar todo lo marcado como ejemplo (nombres, horarios, fotos).
- Fotos de pacientes o del equipo solo con consentimiento escrito (Ley 20.584).
- Crear o renombrar las cuentas a **@advancesantajuana** antes de imprimir
  piezas que las mencionen.
