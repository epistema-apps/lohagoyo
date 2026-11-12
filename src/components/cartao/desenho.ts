// Desenho da tarjeta como lista de comandos (coordenadas em pontos, origem no canto
// superior esquerdo da área de corte). O mesmo desenho vira PDF (render-pdf) e prévia SVG (render-svg).
import QRCode from 'qrcode';
import { LOGO } from '../../marca/logo-dados';
import { LOGO_ESCURO, TEMAS, type CoresLogo, type TemaCartao, type TemaId } from './temas';

export const MM = 72 / 25.4;
export const W = 90 * MM; // 9 cm
export const H = 50 * MM; // 5 cm
export const SANGRIA = 3 * MM;

export type Fonte = 'nome' | 'reg' | 'neg';
export type Medir = (fonte: Fonte, texto: string, tam: number) => number;

export type Cmd =
  | { t: 'rect'; x: number; y: number; w: number; h: number; cor: string; r?: number }
  | { t: 'circ'; cx: number; cy: number; r: number; cor: string }
  | { t: 'texto'; x: number; y: number; txt: string; fonte: Fonte; tam: number; cor: string }
  | { t: 'path'; d: string; x: number; y: number; escala: number; cor: string };

export type EstruturaId = 'clasica' | 'dividida' | 'franja' | 'punto';
export const ESTRUTURAS: { id: EstruturaId; nome: string }[] = [
  { id: 'clasica', nome: 'Clásica' },
  { id: 'dividida', nome: 'Dividida' },
  { id: 'franja', nome: 'Franja' },
  { id: 'punto', nome: 'Punto' },
];

export interface DadosCartao {
  nome: string;
  oficio: string;
  telefone: string;
  email: string;
  comunas: string;
  url: string; // vai no QR
  urlCurta: string; // texto impresso
}

const M = 14; // margem de segurança (~5 mm)

/** Remove caracteres que as fontes não têm. */
export function limpar(s: string): string {
  return s.replace(/[^\x20-\x7E -ÿ–—’·]/g, '').replace(/\s+/g, ' ').trim();
}

function caber(medir: Medir, f: Fonte, txt: string, max: number, larg: number, min = 5): number {
  let t = max;
  while (t > min && medir(f, txt, t) > larg) t -= 0.25;
  return t;
}

/** Nome em uma ou duas linhas. Retorna comandos e a altura usada. */
function blocoNome(medir: Medir, nome: string, x: number, yTopo: number, larg: number, cor: string, max = 15.5) {
  const cmds: Cmd[] = [];
  const t1 = caber(medir, 'nome', nome, max, larg);
  const partes = nome.split(' ');
  if (t1 >= 12 || partes.length < 2) {
    cmds.push({ t: 'texto', x, y: yTopo + t1 * 0.78, txt: nome, fonte: 'nome', tam: t1, cor });
    return { cmds, altura: t1 * 1.02 };
  }
  const l1 = partes[0];
  const l2 = partes.slice(1).join(' ');
  const t = Math.min(caber(medir, 'nome', l1, max, larg), caber(medir, 'nome', l2, max, larg));
  cmds.push({ t: 'texto', x, y: yTopo + t * 0.78, txt: l1, fonte: 'nome', tam: t, cor });
  cmds.push({ t: 'texto', x, y: yTopo + t * 0.78 + t * 1.08, txt: l2, fonte: 'nome', tam: t, cor });
  return { cmds, altura: t * 2.1 };
}

function linhasContato(medir: Medir, d: DadosCartao, x: number, yUltima: number, larg: number, tema: { texto: string; suave: string; acento: string }) {
  const linhas: { txt: string; fonte: Fonte; cor: string }[] = [];
  if (d.telefone) linhas.push({ txt: d.telefone, fonte: 'nome', cor: tema.texto });
  if (d.email) linhas.push({ txt: d.email, fonte: 'reg', cor: tema.texto });
  if (d.comunas) linhas.push({ txt: d.comunas, fonte: 'reg', cor: tema.suave });
  linhas.push({ txt: d.urlCurta, fonte: 'neg', cor: tema.acento });
  const lh = 9.6;
  return linhas.map((l, i) => ({
    t: 'texto' as const,
    x,
    y: yUltima - (linhas.length - 1 - i) * lh,
    txt: l.txt,
    fonte: l.fonte,
    tam: caber(medir, l.fonte, l.txt, 7.2, larg),
    cor: l.cor,
  }));
}

function oficio(medir: Medir, txt: string, x: number, y: number, larg: number, cor: string): Cmd {
  const t = txt.toUpperCase();
  return { t: 'texto', x, y, txt: t, fonte: 'neg', tam: caber(medir, 'neg', t, 6.6, larg), cor };
}

function logo(x: number, y: number, largura: number, cores: CoresLogo): Cmd[] {
  const escala = largura / LOGO.largura;
  return LOGO.partes.map((p) => ({ t: 'path' as const, d: p.d, x, y, escala, cor: cores[p.papel] }));
}
export const alturaLogo = (largura: number) => (largura * LOGO.altura) / LOGO.largura;

/** Path vetorial do QR (módulos 1×1). */
const cacheQr = new Map<string, { d: string; n: number }>();
function qrPath(url: string) {
  const c = cacheQr.get(url);
  if (c) return c;
  const q = QRCode.create(url, { errorCorrectionLevel: 'M' });
  const n = q.modules.size;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (q.modules.get(y, x)) {
        let x2 = x;
        while (x2 < n && q.modules.get(y, x2)) x2++;
        d += `M${x} ${y}h${x2 - x}v1h${x - x2}Z`;
        x = x2;
      } else x++;
    }
  }
  const r = { d, n };
  cacheQr.set(url, r);
  return r;
}
function qr(url: string, x: number, y: number, tam: number): Cmd[] {
  const { d, n } = qrPath(url);
  const pad = tam * 0.07;
  return [
    { t: 'rect', x, y, w: tam, h: tam, cor: '#FFFFFF', r: 3.5 },
    { t: 'path', d, x: x + pad, y: y + pad, escala: (tam - 2 * pad) / n, cor: '#15171C' },
  ];
}

const fundo = (cor: string, b: number): Cmd => ({ t: 'rect', x: -b, y: -b, w: W + 2 * b, h: H + 2 * b, cor });

export function desenharCartao(estrutura: EstruturaId, temaId: TemaId, dados: DadosCartao, medir: Medir, b = SANGRIA): Cmd[] {
  const tema: TemaCartao = TEMAS[temaId];
  const d: DadosCartao = {
    nome: limpar(dados.nome), oficio: limpar(dados.oficio), telefone: limpar(dados.telefone),
    email: limpar(dados.email), comunas: limpar(dados.comunas), url: dados.url, urlCurta: limpar(dados.urlCurta),
  };
  const cmds: Cmd[] = [fundo(tema.fundo, b)];

  if (estrutura === 'clasica') {
    const q = 48;
    const larg = W - 2 * M - q - 8;
    cmds.push(oficio(medir, d.oficio, M, M + 6, larg, tema.acento));
    const n = blocoNome(medir, d.nome, M, M + 11, larg, tema.texto);
    cmds.push(...n.cmds);
    cmds.push({ t: 'rect', x: M, y: M + 11 + n.altura + 4, w: 16, h: 1.6, cor: tema.acento });
    cmds.push(...linhasContato(medir, d, M, H - M, W - 2 * M - 70, tema));
    cmds.push(...qr(d.url, W - M - q, M, q));
    const lw = 56;
    cmds.push(...logo(W - M - lw, H - M - alturaLogo(lw) + 1.5, lw, tema.logo));
  }

  if (estrutura === 'dividida') {
    const P = 88;
    cmds.push({ t: 'rect', x: W - P, y: -b, w: P + b, h: H + 2 * b, cor: tema.painel });
    const larg = W - P - 2 * M + 4;
    cmds.push(oficio(medir, d.oficio, M, M + 6, larg, tema.acento));
    cmds.push(...blocoNome(medir, d.nome, M, M + 11, larg, tema.texto).cmds);
    cmds.push(...linhasContato(medir, d, M, H - M, larg, tema));
    const q = 54;
    cmds.push(...qr(d.url, W - P + (P - q) / 2, M + 2, q));
    const lw = 60;
    cmds.push(...logo(W - P + (P - lw) / 2, H - M - alturaLogo(lw) + 1.5, lw, LOGO_ESCURO));
  }

  if (estrutura === 'franja') {
    const F = 34;
    cmds.push({ t: 'rect', x: -b, y: H - F, w: W + 2 * b, h: F + b, cor: tema.painel });
    const q = 44;
    const larg = W - 2 * M - q - 8;
    cmds.push(oficio(medir, d.oficio, M, M + 6, larg, tema.acento));
    const n = blocoNome(medir, d.nome, M, M + 11, larg, tema.texto);
    cmds.push(...n.cmds);
    if (d.comunas) {
      const tc = caber(medir, 'reg', d.comunas, 7.2, larg);
      cmds.push({ t: 'texto', x: M, y: M + 11 + n.altura + 9, txt: d.comunas, fonte: 'reg', tam: tc, cor: tema.suave });
    }
    cmds.push(...qr(d.url, W - M - q, M, q));
    const lw = 54;
    const larT = W - 2 * M - lw - 10;
    const contato = [d.telefone, d.email].filter(Boolean).join('  ·  ');
    if (contato) cmds.push({ t: 'texto', x: M, y: H - F + 14, txt: contato, fonte: 'nome', tam: caber(medir, 'nome', contato, 7, larT), cor: '#FFFFFF' });
    cmds.push({ t: 'texto', x: M, y: H - F + 24.5, txt: d.urlCurta, fonte: 'reg', tam: caber(medir, 'reg', d.urlCurta, 7, larT), cor: '#D9B87A' });
    cmds.push(...logo(W - M - lw, H - F / 2 - alturaLogo(lw) / 2, lw, LOGO_ESCURO));
  }

  if (estrutura === 'punto') {
    cmds.push({ t: 'circ', cx: W - 6, cy: 4, r: 58, cor: tema.circulo });
    const lw = 52;
    cmds.push(...logo(M - 1, M - 3, lw, tema.logo));
    const larg = W - 2 * M - 62;
    cmds.push(oficio(medir, d.oficio, M, M + 30, larg, tema.acento));
    cmds.push(...blocoNome(medir, d.nome, M, M + 35, larg + 20, tema.texto, 15).cmds);
    const q = 44;
    cmds.push(...linhasContato(medir, d, M, H - M, W - 2 * M - q - 10, tema));
    cmds.push(...qr(d.url, W - M - q, H - M - q, q));
  }

  return cmds;
}
