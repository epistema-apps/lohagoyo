// Gera o logo LoHagoYo.cl em curvas (Plus Jakarta Sans 600).
// Uso (na raiz do projeto):  node docs/marca/gerar-logo.mjs
// Saídas: public/marca/*.svg, public/favicon.svg e src/marca/logo-dados.ts (usado no PDF da tarjeta).
import opentype from 'opentype.js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
function fonte(arq) {
  const b = readFileSync(require.resolve(`@fontsource/plus-jakarta-sans/files/${arq}`));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const F600 = fonte('plus-jakarta-sans-latin-600-normal.woff');

export const CORES = {
  grafito: '#15171C', ocre: '#9C7636', ocreClaro: '#C79B4B', ocreSuave: '#D9B87A', branco: '#FFFFFF', cinza: '#8A8D94', cinzaClaro: '#A5A8AE',
};
const S = 100; // tamanho base
const TR = -0.035; // tracking

function texto(font, t, x0, base, size, track) {
  let x = x0, d = '', minY = Infinity, maxY = -Infinity;
  const s = size / font.unitsPerEm;
  const gs = font.stringToGlyphs(t);
  gs.forEach((g, i) => {
    const p = g.getPath(x, base, size);
    const bb = p.getBoundingBox();
    if (Number.isFinite(bb.y1)) { minY = Math.min(minY, bb.y1); maxY = Math.max(maxY, bb.y2); }
    d += p.toPathData(2);
    x += g.advanceWidth * s + track * size;
    if (i < gs.length - 1) x += font.getKerningValue(g, gs[i + 1]) * s;
  });
  return { d, fim: x - track * size, minY, maxY };
}
const circulo = (cx, cy, r) =>
  `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

/** Logo horizontal com papéis. Coordenadas SVG (y para baixo), origem no canto. */
function horizontal() {
  const pad = 10;
  const a = texto(F600, 'LoHago', 0, 0, S, TR);
  const b = texto(F600, 'Yo', a.fim + TR * S, 0, S, TR);
  const r = 9, cx = b.fim + 5 + r;
  const c = texto(F600, 'cl', cx + r + 4, 0, S * 0.46, -0.01);
  const minY = Math.min(a.minY, b.minY), maxY = Math.max(a.maxY, b.maxY);
  const dx = pad, dy = pad - minY;
  const A = texto(F600, 'LoHago', dx, dy, S, TR);
  const B = texto(F600, 'Yo', dx + a.fim + TR * S, dy, S, TR);
  const Cl = texto(F600, 'cl', dx + cx + r + 4, dy, S * 0.46, -0.01);
  return {
    largura: Math.ceil(c.fim + pad * 2),
    altura: Math.ceil(maxY - minY + pad * 2),
    partes: [
      { papel: 'texto', d: A.d },
      { papel: 'yo', d: B.d },
      { papel: 'ponto', d: circulo(dx + cx, dy - r, r) },
      { papel: 'dominio', d: Cl.d },
    ],
  };
}

const L = horizontal();
const svg = (cores) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.largura} ${L.altura}" role="img" aria-label="LoHagoYo.cl">${L.partes
    .map((p) => `<path fill="${cores[p.papel]}" d="${p.d}"/>`)
    .join('')}</svg>`;

export const TEMAS_LOGO = {
  claro: { texto: CORES.grafito, yo: CORES.ocre, ponto: CORES.ocreClaro, dominio: CORES.cinza },
  escuro: { texto: CORES.branco, yo: CORES.ocreSuave, ponto: CORES.ocreSuave, dominio: CORES.cinzaClaro },
};

mkdirSync('public/marca', { recursive: true });
writeFileSync('public/marca/logo.svg', svg(TEMAS_LOGO.claro));
writeFileSync('public/marca/logo-negativo.svg', svg(TEMAS_LOGO.escuro));

// Ícone: "Yo." em quadrado grafito
{
  const Q = 256;
  const y = texto(F600, 'Yo', 0, 0, S, TR);
  const r = 9, w = y.fim + 5 + 2 * r, h = y.maxY - y.minY;
  const k = Math.min((Q * 0.62) / w, (Q * 0.5) / h);
  const dx = (Q - w * k) / 2, dy = (Q - h * k) / 2 - y.minY * k;
  writeFileSync(
    'public/marca/icone.svg',
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Q} ${Q}" role="img" aria-label="LoHagoYo.cl"><rect width="${Q}" height="${Q}" rx="56" fill="${CORES.grafito}"/><g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(4)})"><path fill="${CORES.branco}" d="${y.d}"/><path fill="${CORES.ocreSuave}" d="${circulo(y.fim + 5 + r, -r, r)}"/></g></svg>`,
  );
  writeFileSync('public/favicon.svg', readFileSync('public/marca/icone.svg'));
}

mkdirSync('src/marca', { recursive: true });
writeFileSync(
  'src/marca/logo-dados.ts',
  `// GERADO por docs/marca/gerar-logo.mjs — não editar à mão.\n` +
    `export type PapelLogo = 'texto' | 'yo' | 'ponto' | 'dominio';\n` +
    `export const LOGO = ${JSON.stringify(L)} as { largura: number; altura: number; partes: { papel: PapelLogo; d: string }[] };\n`,
);
console.log('logo gerado', L.largura, 'x', L.altura);
