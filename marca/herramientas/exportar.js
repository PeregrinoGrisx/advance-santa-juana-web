// Exporta las plantillas a PNG y el afiche y el manual a PDF, con Edge o Chrome.
//
//   npm install puppeteer-core
//   node marca/herramientas/exportar.js
//
// Si el navegador no está en la ruta de siempre: NAVEGADOR="C:/ruta/chrome.exe" node ...
// Necesita internet para cargar la tipografía Urbanist desde Google Fonts.
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const MARCA = path.resolve(__dirname, "..");
const CANDIDATOS = [
  process.env.NAVEGADOR,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].filter(Boolean);
const navegador = CANDIDATOS.find((p) => fs.existsSync(p));
if (!navegador) throw new Error("No encontré Edge ni Chrome. Indica la ruta con NAVEGADOR=...");

const url = (rel) => "file:///" + path.join(MARCA, rel).replace(/\\/g, "/");

(async () => {
  const b = await puppeteer.launch({ executablePath: navegador, headless: "new" });
  const p = await b.newPage();
  const dir = path.join(MARCA, "plantillas");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    await p.goto(url("plantillas/" + f), { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    const nombre = f.replace(".html", "");
    if (nombre === "afiche-a4") {
      await p.pdf({ path: path.join(dir, nombre + ".pdf"), preferCSSPageSize: true, printBackground: true });
      await p.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    } else {
      await p.setViewport({ width: 1640, height: 1920, deviceScaleFactor: 1 });
    }
    const el = await p.$("#lienzo");
    await el.screenshot({ path: path.join(dir, nombre + ".png") });
    console.log("✓", nombre);
  }
  if (fs.existsSync(path.join(MARCA, "manual-de-marca.html"))) {
    await p.goto(url("manual-de-marca.html"), { waitUntil: "networkidle0" });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: path.join(MARCA, "manual-de-marca.pdf"), preferCSSPageSize: true, printBackground: true });
    console.log("✓ manual-de-marca.pdf");
  }
  await b.close();
})();
