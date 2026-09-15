import { PNG } from "pngjs";
import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";

// Vector artwork extracted from ccfw/CC Icon Black.ai, without redrawing it.
const mark = readFileSync(
  new URL("../assets/cc-mark.svg", import.meta.url),
  "utf8",
);
function render(name, size, inset, background) {
  const artwork = mark.replace(
    /width="288" height="288"/,
    `x="${inset}" y="${inset}" width="${size - inset * 2}" height="${size - inset * 2}"`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ""}${artwork}</svg>`;
  writeFileSync(new URL(`../assets/${name}.svg`, import.meta.url), svg);
  const rendered = new Resvg(svg).render().asPng();
  // iOS requires an opaque RGB icon; retain alpha for Android and the header.
  const png = background
    ? PNG.sync.write(PNG.sync.read(rendered), { colorType: 2 })
    : rendered;
  writeFileSync(new URL(`../assets/${name}.png`, import.meta.url), png);
}
render("fwcc-icon", 1024, 64, "#ffffff");
// Keep the entire mark inside Android's central adaptive-icon safe area.
render("fwcc-adaptive", 1024, 200);
render("cc-header", 160, 0);
