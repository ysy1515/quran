/* exported appIcon, mushafSymbol, star8, G, defs */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Shared SVG pieces. No lettering is drawn as shapes; all Arabic text is typeset with real fonts.
const G = { green: "#0B3D2A", greenDeep: "#062A1C", greenMid: "#145A3E", gold: "#D6AE5C", goldLight: "#F1D894", goldDeep: "#A97C2F", ivory: "#F6F0E1" };

function star8(cx, cy, r, inner = 0.765, rot = Math.PI / 8) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rot;
    const rr = i % 2 ? r * inner : r;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

const defs = `
<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="${G.goldLight}"/><stop offset="0.55" stop-color="${G.gold}"/><stop offset="1" stop-color="${G.goldDeep}"/>
  </linearGradient>
  <radialGradient id="bg" cx="0.5" cy="0.32" r="0.85">
    <stop offset="0" stop-color="${G.greenMid}"/><stop offset="0.65" stop-color="${G.green}"/><stop offset="1" stop-color="${G.greenDeep}"/>
  </radialGradient>
</defs>`;

// Concept B / final symbol: an open Mushaf (two pages meeting at the spine) under a Rub el Hizb star,
// the quarter-hizb mark printed in every Mushaf. Drawn on a 100x100 grid.
function mushafSymbol({ fill = "url(#gold)", page = G.ivory, star = "url(#gold)", lines = true, ribbon = G.goldLight } = {}) {
  const left = "M50 78 C42 72 30 69 17 70 L17 38 C30 37 42 40 50 46 Z";
  const right = "M50 78 C58 72 70 69 83 70 L83 38 C70 37 58 40 50 46 Z";
  const coverL = "M50 82 C41 76 28 73 13 74 L13 42 L17 41.5 L17 70 C30 69 42 72 50 78 Z";
  const coverR = "M50 82 C59 76 72 73 87 74 L87 42 L83 41.5 L83 70 C70 69 58 72 50 78 Z";
  const pl = lines
    ? [0, 1, 2].map((i) => `<path d="M23 ${50 + i * 6} C32 ${49.5 + i * 6} 40 ${51.5 + i * 6} 46 ${54.5 + i * 6}" stroke="${G.gold}" stroke-opacity="0.55" stroke-width="1.1" fill="none" stroke-linecap="round"/>
       <path d="M77 ${50 + i * 6} C68 ${49.5 + i * 6} 60 ${51.5 + i * 6} 54 ${54.5 + i * 6}" stroke="${G.gold}" stroke-opacity="0.55" stroke-width="1.1" fill="none" stroke-linecap="round"/>`).join("")
    : "";
  return `
  <path d="${left}" fill="${page}"/><path d="${right}" fill="${page}"/>
  ${pl}
  <path d="${coverL}" fill="${fill}"/><path d="${coverR}" fill="${fill}"/>
  <path d="M50 46 L50 78" stroke="${G.goldDeep}" stroke-width="1" stroke-opacity="0.6"/>
  ${ribbon ? `<path d="M46.6 79 L53.4 79 L53.4 94 L50 90.6 L46.6 94 Z" fill="${ribbon}"/>` : ""}
  <polygon points="${star8(50, 25, 11.5)}" fill="${star}"/>
  <polygon points="${star8(50, 25, 5.2)}" fill="${G.green}" opacity="0.9"/>`;
}

function appIcon(size, { light = false } = {}) {
  const bg = light ? `<rect width="100" height="100" fill="${G.ivory}"/>` : `<rect width="100" height="100" fill="url(#bg)"/>`;
  const sym = light ? mushafSymbol({ fill: G.green, page: "#fff", star: G.green, ribbon: G.gold }) : mushafSymbol();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">${defs}${bg}<g transform="translate(50 54) scale(0.9) translate(-50 -58)">${sym}</g></svg>`;
}
