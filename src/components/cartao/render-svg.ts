// Prévia da tarjeta em SVG (mesmos comandos do PDF).
import { H, W, type Cmd } from './desenho';

const familia: Record<string, string> = {
  nome: `font-family="'Plus Jakarta Sans', sans-serif" font-weight="700"`,
  reg: `font-family="'Atkinson Hyperlegible', sans-serif" font-weight="400"`,
  neg: `font-family="'Atkinson Hyperlegible', sans-serif" font-weight="700"`,
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function cartaoSvg(cmds: Cmd[], id = 'c'): string {
  const corpo = cmds
    .map((c) => {
      if (c.t === 'rect') return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="${c.r ?? 0}" fill="${c.cor}"/>`;
      if (c.t === 'circ') return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.cor}"/>`;
      if (c.t === 'texto') return `<text x="${c.x}" y="${c.y}" font-size="${c.tam}" ${familia[c.fonte]} fill="${c.cor}">${esc(c.txt)}</text>`;
      return `<path transform="translate(${c.x} ${c.y}) scale(${c.escala})" d="${c.d}" fill="${c.cor}"/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img"><defs><clipPath id="${id}"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#${id})">${corpo}</g></svg>`;
}
