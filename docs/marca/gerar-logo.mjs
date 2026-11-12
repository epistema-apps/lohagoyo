import opentype from 'opentype.js';
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2];
const buf = readFileSync('node_modules/@fontsource/unbounded/files/unbounded-latin-900-normal.woff');
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

const C = { cobalto: '#2433C8', amarelo: '#FFC61A', tinta: '#0E1230', branco: '#FFFFFF' };

// segs: [[texto, cor], ...] -> {d por cor, largura, bbox}
function texto(segs, size, track = -0.03) {
  let x = 0; const partes = []; const s = size / font.unitsPerEm;
  let minY = Infinity, maxY = -Infinity;
  for (const [t, cor] of segs) {
    let d = '';
    const gs = font.stringToGlyphs(t);
    gs.forEach((g, i) => {
      const p = g.getPath(x, 0, size);
      const bb = p.getBoundingBox(); minY = Math.min(minY, bb.y1); maxY = Math.max(maxY, bb.y2);
      d += p.toPathData(2);
      x += g.advanceWidth * s + track * size;
      if (i < gs.length - 1) { x += font.getKerningValue(g, gs[i + 1]) * s; if (t[i] === 'Y' && t[i+1] === 'o') x -= 0.09 * size; }
    });
    partes.push({ d, cor });
  }
  return { partes, w: x - track * size, minY, maxY };
}
const g = (t, dx, dy) => t.partes.map(p => `<path transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)})" fill="${p.cor}" d="${p.d}"/>`).join('');

// 1) Sticker (fundo cobalto inclinado) — uso principal / redes / material
{
  const t = texto([['¡', C.amarelo], ['LoHago', C.branco], ['Yo', C.amarelo], ['!', C.amarelo]], 100);
  const padX = 46, padY = 34, h = t.maxY - t.minY;
  const W = t.w + padX * 2, H = h + padY * 2;
  const VW = W + 40, VH = H + 60;
  writeFileSync(`${out}/logo-sticker.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}" role="img" aria-label="¡Lo Hago Yo!"><g transform="rotate(-3 ${VW/2} ${VH/2})"><rect x="${(VW-W)/2+8}" y="${(VH-H)/2+10}" width="${W}" height="${H}" rx="22" fill="${C.tinta}"/><rect x="${(VW-W)/2}" y="${(VH-H)/2}" width="${W}" height="${H}" rx="22" fill="${C.cobalto}"/>${g(t, (VW-W)/2+padX, (VH-H)/2+padY-t.minY)}</g></svg>`);
}
// 2) Horizontal para fundo claro: tinta + marca-texto amarelo atrás de "Yo"
{
  const a = texto([['¡', C.cobalto], ['LoHago', C.tinta]], 100);
  const b = texto([['Yo', C.tinta]], 100);
  const c = texto([['!', C.cobalto]], 100);
  const tr = -0.03 * 100;
  const xb = a.w + tr + 8, xc = xb + b.w + tr + 8;
  const minY = Math.min(a.minY, b.minY, c.minY), maxY = Math.max(a.maxY, b.maxY, c.maxY);
  const W = xc + c.w, pad = 14;
  const VW = W + pad * 2, VH = maxY - minY + pad * 2;
  const base = pad - minY;
  // marca-texto: retângulo levemente torto cobrindo metade inferior do "Yo"
  const hx = pad + xb - 10, hw = b.w + 20, hy = base - 52, hh = 50;
  writeFileSync(`${out}/logo.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}" role="img" aria-label="¡Lo Hago Yo!"><path fill="${C.amarelo}" d="M${hx} ${hy+6-40} L${hx+hw} ${hy-40} L${hx+hw-4} ${hy+hh} L${hx+3} ${hy+hh+4} Z"/>${g(a, pad, base)}${g(b, pad + xb, base)}${g(c, pad + xc, base)}</svg>`);
  // versão para fundo escuro
  const ab = texto([['¡', C.amarelo], ['LoHago', C.branco]], 100), bb = texto([['Yo', C.tinta]], 100), cb = texto([['!', C.amarelo]], 100);
  writeFileSync(`${out}/logo-negativo.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}" role="img" aria-label="¡Lo Hago Yo!"><path fill="${C.amarelo}" d="M${hx} ${hy+6-40} L${hx+hw} ${hy-40} L${hx+hw-4} ${hy+hh} L${hx+3} ${hy+hh+4} Z"/>${g(ab, pad, base)}${g(bb, pad + xb, base)}${g(cb, pad + xc, base)}</svg>`);
}
// 3) Ícone quadrado ¡Yo!
{
  const t = texto([['¡', C.amarelo], ['Yo', C.branco], ['!', C.amarelo]], 100, -0.02);
  const S = 256, h = t.maxY - t.minY, k = Math.min((S * 0.74) / t.w, (S * 0.6) / h);
  const dx = (S - t.w * k) / 2, dy = (S - h * k) / 2 - t.minY * k;
  writeFileSync(`${out}/icone.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" role="img" aria-label="¡Lo Hago Yo!"><rect width="${S}" height="${S}" rx="56" fill="${C.cobalto}"/><g transform="translate(${dx.toFixed(1)} ${dy.toFixed(1)}) scale(${k.toFixed(4)})">${t.partes.map(p => `<path fill="${p.cor}" d="${p.d}"/>`).join('')}</g></svg>`);
}
console.log('ok');
