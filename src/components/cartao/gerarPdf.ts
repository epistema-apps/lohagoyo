// Gera o PDF da tarjeta no navegador (sem servidor).
//  - 'imprenta': 9 × 5 cm com sangria de 3 mm e marcas de corte.
//  - 'a4': folha A4 com 10 tarjetas e guias de corte (impressão caseira).
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb,
  type PDFFont, type PDFPage,
} from 'pdf-lib';
import { desenharCartao, H, MM, SANGRIA, W, type Cmd, type DadosCartao, type EstruturaId, type Fonte, type Medir } from './desenho';
import type { TemaId } from './temas';

export type SaidaCartao = 'imprenta' | 'a4';
export type { DadosCartao, EstruturaId, TemaId };

export const ARQUIVOS_FONTE: Record<Fonte, string> = {
  nome: '/fonts/plus-jakarta-sans-latin-700-normal.woff',
  reg: '/fonts/atkinson-hyperlegible-latin-400-normal.woff',
  neg: '/fonts/atkinson-hyperlegible-latin-700-normal.woff',
};

export type CarregarFonte = (caminho: string) => Promise<ArrayBuffer | Uint8Array>;
const carregarPorFetch: CarregarFonte = async (c) => (await fetch(c)).arrayBuffer();

const cacheBytes = new Map<string, Promise<ArrayBuffer | Uint8Array>>();
function bytesFonte(c: string, carregar: CarregarFonte) {
  if (!cacheBytes.has(c)) cacheBytes.set(c, carregar(c));
  return cacheBytes.get(c)!;
}

async function embutirFontes(doc: PDFDocument, carregar: CarregarFonte, subset = true) {
  doc.registerFontkit(fontkit);
  const f = {} as Record<Fonte, PDFFont>;
  for (const k of Object.keys(ARQUIVOS_FONTE) as Fonte[]) f[k] = await doc.embedFont(await bytesFonte(ARQUIVOS_FONTE[k], carregar), { subset });
  return f;
}

/** Medidor de texto com as mesmas fontes do PDF (para a prévia). */
export async function criarMedidor(carregar: CarregarFonte = carregarPorFetch): Promise<Medir> {
  const doc = await PDFDocument.create();
  const f = await embutirFontes(doc, carregar, false);
  return (fonte, txt, tam) => f[fonte].widthOfTextAtSize(txt, tam);
}

function hex(c: string) {
  const n = parseInt(c.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function rectArredondado(w: number, h: number, r: number) {
  return `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}

/** Desenha os comandos com o canto superior esquerdo do corte em (ox, topo) da página. */
function renderPdf(page: PDFPage, cmds: Cmd[], f: Record<Fonte, PDFFont>, ox: number, topo: number, b: number) {
  page.pushOperators(pushGraphicsState(), rectangle(ox - b, topo - H - b, W + 2 * b, H + 2 * b), clip(), endPath());
  for (const c of cmds) {
    if (c.t === 'rect') {
      if (c.r) page.drawSvgPath(rectArredondado(c.w, c.h, c.r), { x: ox + c.x, y: topo - c.y, color: hex(c.cor) });
      else page.drawRectangle({ x: ox + c.x, y: topo - c.y - c.h, width: c.w, height: c.h, color: hex(c.cor) });
    } else if (c.t === 'circ') {
      page.drawCircle({ x: ox + c.cx, y: topo - c.cy, size: c.r, color: hex(c.cor) });
    } else if (c.t === 'texto') {
      page.drawText(c.txt, { x: ox + c.x, y: topo - c.y, size: c.tam, font: f[c.fonte], color: hex(c.cor) });
    } else {
      page.drawSvgPath(c.d, { x: ox + c.x, y: topo - c.y, scale: c.escala, color: hex(c.cor) });
    }
  }
  page.pushOperators(popGraphicsState());
}

function marcasDeCorte(page: PDFPage, x: number, yBase: number) {
  const off = SANGRIA + 1.5 * MM;
  const len = 5 * MM;
  const c = rgb(0, 0, 0);
  for (const [cx, sx] of [[x, -1], [x + W, 1]] as const) {
    for (const [cy, sy] of [[yBase, -1], [yBase + H, 1]] as const) {
      page.drawLine({ start: { x: cx + sx * off, y: cy }, end: { x: cx + sx * (off + len), y: cy }, thickness: 0.4, color: c });
      page.drawLine({ start: { x: cx, y: cy + sy * off }, end: { x: cx, y: cy + sy * (off + len) }, thickness: 0.4, color: c });
    }
  }
}

export async function gerarPdfCartao(
  dados: DadosCartao, estrutura: EstruturaId, tema: TemaId, saida: SaidaCartao,
  carregar: CarregarFonte = carregarPorFetch,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Tarjeta ${dados.nome} — LoHagoYo.cl`);
  doc.setCreator('LoHagoYo.cl');
  const f = await embutirFontes(doc, carregar);
  const medir: Medir = (fonte, txt, tam) => f[fonte].widthOfTextAtSize(txt, tam);

  if (saida === 'imprenta') {
    const margem = SANGRIA + 8 * MM;
    const page = doc.addPage([W + 2 * margem, H + 2 * margem]);
    page.setTrimBox(margem, margem, W, H);
    page.setBleedBox(margem - SANGRIA, margem - SANGRIA, W + 2 * SANGRIA, H + 2 * SANGRIA);
    renderPdf(page, desenharCartao(estrutura, tema, dados, medir, SANGRIA), f, margem, margem + H, SANGRIA);
    marcasDeCorte(page, margem, margem);
  } else {
    const A4: [number, number] = [210 * MM, 297 * MM];
    const page = doc.addPage(A4);
    const cols = 2, filas = 5;
    const x0 = (A4[0] - cols * W) / 2;
    const y0 = (A4[1] - filas * H) / 2;
    const cmds = desenharCartao(estrutura, tema, dados, medir, 0);
    for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) renderPdf(page, cmds, f, x0 + i * W, y0 + (j + 1) * H, 0);
    const guia = rgb(0.75, 0.75, 0.75);
    for (let i = 0; i <= cols; i++) {
      const gx = x0 + i * W;
      page.drawLine({ start: { x: gx, y: 4 * MM }, end: { x: gx, y: y0 - 2 * MM }, thickness: 0.4, color: guia });
      page.drawLine({ start: { x: gx, y: y0 + filas * H + 2 * MM }, end: { x: gx, y: A4[1] - 4 * MM }, thickness: 0.4, color: guia });
    }
    for (let j = 0; j <= filas; j++) {
      const gy = y0 + j * H;
      page.drawLine({ start: { x: 4 * MM, y: gy }, end: { x: x0 - 2 * MM, y: gy }, thickness: 0.4, color: guia });
      page.drawLine({ start: { x: x0 + cols * W + 2 * MM, y: gy }, end: { x: A4[0] - 4 * MM, y: gy }, thickness: 0.4, color: guia });
    }
    page.drawText('Imprime al 100% (tamaño real) y corta siguiendo las guías grises.  LoHagoYo.cl', {
      x: x0, y: 8 * MM, size: 7, font: f.reg, color: rgb(0.5, 0.5, 0.5),
    });
  }
  return doc.save();
}
