// Gera o PDF da tarjeta de presentación no navegador (sem servidor).
// Tamanho chileno padrão: 9 × 5 cm. Duas saídas:
//  - 'imprenta': uma tarjeta com sangria de 3 mm e marcas de corte.
//  - 'a4': folha A4 com 10 tarjetas e guias de corte (impressão caseira).
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib';
import QRCode from 'qrcode';

export type ModeloCartao = 'clasico' | 'color' | 'minimo';
export type SaidaCartao = 'imprenta' | 'a4';

export interface DadosCartao {
  nome: string;
  oficio: string;
  telefone: string;
  email: string;
  comunas: string;
  url: string; // URL completa (vai no QR)
  urlCurta: string; // texto impresso
  cor: string; // hex
}

const MM = 72 / 25.4;
const W = 90 * MM;
const H = 50 * MM;
const SANGRIA = 3 * MM;

function hexParaRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Remove caracteres fora do WinAnsi (fontes padrão do PDF), mantendo acentos latinos. */
function limpar(s: string): string {
  return s.replace(/[^\x20-\x7E -ÿ]/g, '').trim();
}

/** Maior tamanho de fonte (até `max`) que cabe em `largura`. */
function caber(fonte: PDFFont, texto: string, max: number, largura: number, min = 5): number {
  let t = max;
  while (t > min && fonte.widthOfTextAtSize(texto, t) > largura) t -= 0.25;
  return t;
}

interface Recursos { regular: PDFFont; negrito: PDFFont; qr: PDFImage; qrBranco: PDFImage }

function desenharCartao(page: PDFPage, x: number, y: number, modelo: ModeloCartao, d: DadosCartao, r: Recursos, sangria: number) {
  const cor = hexParaRgb(d.cor);
  const tinta = rgb(0.11, 0.14, 0.2);
  const cinza = rgb(0.38, 0.41, 0.47);
  const branco = rgb(1, 1, 1);
  const nome = limpar(d.nome);
  const oficio = limpar(d.oficio).toUpperCase();
  const linhas = [limpar(d.telefone), limpar(d.email), limpar(d.comunas)].filter(Boolean);
  const url = limpar(d.urlCurta);
  const m = 5 * MM; // margem de segurança interna

  if (modelo === 'color') {
    page.drawRectangle({ x: x - sangria, y: y - sangria, width: W + 2 * sangria, height: H + 2 * sangria, color: cor });
    const q = 20 * MM;
    page.drawImage(r.qrBranco, { x: x + W - m - q, y: y + m, width: q, height: q });
    const larg = W - 2 * m - q - 3 * MM;
    page.drawText(oficio, { x: x + m, y: y + H - m - 6, size: caber(r.negrito, oficio, 7, larg), font: r.negrito, color: branco, opacity: 0.85 });
    const tn = caber(r.negrito, nome, 15, larg);
    page.drawText(nome, { x: x + m, y: y + H - m - 6 - tn - 3, size: tn, font: r.negrito, color: branco });
    let ly = y + m + 2 + (linhas.length) * 9.5;
    for (const l of linhas) {
      page.drawText(l, { x: x + m, y: ly, size: caber(r.regular, l, 7.5, larg), font: r.regular, color: branco });
      ly -= 9.5;
    }
    page.drawText(url, { x: x + m, y: y + m, size: caber(r.negrito, url, 7, larg), font: r.negrito, color: branco });
    return;
  }

  if (modelo === 'clasico') {
    page.drawRectangle({ x: x - sangria, y: y - sangria, width: W + 2 * sangria, height: H + 2 * sangria, color: branco });
    page.drawRectangle({ x: x - sangria, y: y - sangria, width: 4 * MM + sangria, height: H + 2 * sangria, color: cor });
    const q = 19 * MM;
    page.drawImage(r.qr, { x: x + W - m - q + 2, y: y + m - 2, width: q, height: q });
    const x0 = x + 4 * MM + 4 * MM;
    const larg = W - (x0 - x) - q - 4 * MM;
    const tn = caber(r.negrito, nome, 14, W - (x0 - x) - m);
    page.drawText(nome, { x: x0, y: y + H - m - tn, size: tn, font: r.negrito, color: tinta });
    page.drawText(oficio, { x: x0, y: y + H - m - tn - 11, size: caber(r.negrito, oficio, 7, W - (x0 - x) - m), font: r.negrito, color: cor });
    let ly = y + m + 2 + linhas.length * 9.5;
    for (const l of linhas) {
      page.drawText(l, { x: x0, y: ly, size: caber(r.regular, l, 7.5, larg), font: r.regular, color: tinta });
      ly -= 9.5;
    }
    page.drawText(url, { x: x0, y: y + m, size: caber(r.negrito, url, 7, larg), font: r.negrito, color: cor });
    return;
  }

  // minimo: branco, tudo centralizado
  page.drawRectangle({ x: x - sangria, y: y - sangria, width: W + 2 * sangria, height: H + 2 * sangria, color: branco });
  const centro = (t: string, f: PDFFont, s: number, yy: number, c: RGB) =>
    page.drawText(t, { x: x + (W - f.widthOfTextAtSize(t, s)) / 2, y: yy, size: s, font: f, color: c });
  const tn = caber(r.negrito, nome, 15, W - 2 * m);
  centro(nome, r.negrito, tn, y + H - m - tn - 2, tinta);
  const to = caber(r.negrito, oficio, 7, W - 2 * m);
  centro(oficio, r.negrito, to, y + H - m - tn - 14, cor);
  page.drawRectangle({ x: x + W / 2 - 8 * MM, y: y + H - m - tn - 19, width: 16 * MM, height: 1, color: cor });
  const contato = [linhas[0], linhas[1]].filter(Boolean).join('   ·   ');
  if (contato) centro(contato, r.regular, caber(r.regular, contato, 7.5, W - 2 * m), y + m + 13, tinta);
  centro(url, r.negrito, caber(r.negrito, url, 7.5, W - 2 * m), y + m + 2, cor);
}

function marcasDeCorte(page: PDFPage, x: number, y: number) {
  const off = SANGRIA + 1.5 * MM;
  const len = 5 * MM;
  const c = rgb(0, 0, 0);
  const t = 0.4;
  for (const [cx, sx] of [[x, -1], [x + W, 1]] as const) {
    for (const [cy, sy] of [[y, -1], [y + H, 1]] as const) {
      page.drawLine({ start: { x: cx + sx * off, y: cy }, end: { x: cx + sx * (off + len), y: cy }, thickness: t, color: c });
      page.drawLine({ start: { x: cx, y: cy + sy * off }, end: { x: cx, y: cy + sy * (off + len) }, thickness: t, color: c });
    }
  }
}

async function qrPng(url: string, escuro: string, claro: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 512, errorCorrectionLevel: 'M', color: { dark: escuro, light: claro } });
  const b64 = dataUrl.split(',')[1];
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

export async function gerarPdfCartao(d: DadosCartao, modelo: ModeloCartao, saida: SaidaCartao): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Tarjeta ${d.nome} — Lo Hago Yo`);
  doc.setCreator('Lo Hago Yo (lohagoyo.cl)');
  const r: Recursos = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    negrito: await doc.embedFont(StandardFonts.HelveticaBold),
    qr: await doc.embedPng(await qrPng(d.url, '#1d2433', '#ffffff')),
    qrBranco: await doc.embedPng(await qrPng(d.url, '#1d2433', '#ffffff')),
  };

  if (saida === 'imprenta') {
    const margem = SANGRIA + 8 * MM; // espaço para as marcas de corte
    const page = doc.addPage([W + 2 * margem, H + 2 * margem]);
    page.setTrimBox(margem, margem, W, H);
    page.setBleedBox(margem - SANGRIA, margem - SANGRIA, W + 2 * SANGRIA, H + 2 * SANGRIA);
    desenharCartao(page, margem, margem, modelo, d, r, SANGRIA);
    marcasDeCorte(page, margem, margem);
  } else {
    const A4: [number, number] = [210 * MM, 297 * MM];
    const page = doc.addPage(A4);
    const cols = 2;
    const filas = 5;
    const x0 = (A4[0] - cols * W) / 2;
    const y0 = (A4[1] - filas * H) / 2;
    for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) desenharCartao(page, x0 + i * W, y0 + j * H, modelo, d, r, 0);
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
    page.drawText('Imprime al 100% (tamaño real). Corta siguiendo las guías grises. — lohagoyo.cl', {
      x: x0, y: 8 * MM, size: 7, font: r.regular, color: rgb(0.5, 0.5, 0.5),
    });
  }
  return doc.save();
}
