#!/usr/bin/env bash
# Publica la web de Advance Salud en Cloudflare Pages (proyecto «advance-salud»).
#
#   bash publicar.sh            # arma una copia limpia y la sube a producción
#   bash publicar.sh --prueba   # la sube como vista previa, sin tocar producción
#
# Usa la sesión de Cloudflare de administracion@advanceclinica.cl, guardada en
# ~/.config-advance (separada de otras cuentas de este computador). Si la sesión
# venció:  XDG_CONFIG_HOME="$HOME/.config-advance" npx wrangler@4.45.0 login
set -euo pipefail
cd "$(dirname "$0")"

OUT=_publicar
rm -rf "$OUT" && mkdir -p "$OUT"
cp -r advance-web/. "$OUT/"

# Fuera lo que es de trabajo y no debe quedar público.
rm -f "$OUT"/_animacion.html "$OUT"/README.md "$OUT"/brand.css "$OUT"/styles.css
rm -f "$OUT"/assets/js/{auditar,auditar-contraste,escanear,escaner-sonda,generar-fondos}.js
rm -f "$OUT"/assets/css/*.map
rm -rf "$OUT"/assets/icon/icomoon/demo-files "$OUT"/assets/icon/icomoon/demo.html \
       "$OUT"/assets/icon/icomoon/selection.json "$OUT/assets/icon/icomoon/Read Me.txt"

RAMA=main
[[ "${1:-}" == "--prueba" ]] && RAMA=prueba

export XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config-advance}"
npx -y wrangler@4.45.0 pages deploy "$OUT" --project-name advance-salud --branch "$RAMA" --commit-dirty=true
