// Desenho da tarjeta como lista de comandos (coordenadas em pontos, origem no canto
// superior esquerdo da área de corte). O mesmo desenho vira PDF (gerarPdf) e prévia SVG (render-svg).
// Estilo editorial, igual ao site do profissional: marca com ponto ocre, sobretítulo com traço,
// muito respiro e o logo LoHagoYo.cl discreto.
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

export type EstruturaId = 'editorial' | 'dividida' | 'franja' | 'punto';
export const ESTRUTURAS: { id: EstruturaId; nome: string }[] = [
  { id: 'editorial', nome: 'Editorial' },
  { id: 'dividida', nome: 'Dividida' },
  { id: 'franja', nome: 'Franja' },
  { id: 'punto', nome: 'Punto' },
];

export interface DadosCartao {
  marca: string; // 'Manu Piscinas'
  nome: string; // pessoa: 'Manuel Araneda'
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
  return s.replace(/[^\x20-\x7E -ÿ–—’]/g, '').replace(/\s+/g, ' ').trim();
}

function caber(medir: Medir, f: Fonte, txt: string, max: number, larg: number, min = 5): number {
  let t = max;
  while (t > min && medir(f, txt, t) > larg) t -= 0.25;
  return t;
}

/** Marca em uma ou duas linhas, com o ponto final na cor de acento. */
function blocoMarca(medir: Medir, marca: string, x: number, yTopo: number, larg: number, cor: string, corPonto: string, max = 19) {
  const cmds: Cmd[] = [];
  const linha = (txt: string, tam: number, y: number, ponto: boolean) => {
    cmds.push({ t: 'texto', x, y, txt, fonte: 'nome', tam, cor });
    if (ponto) cmds.push({ t: 'texto', x: x + medir('nome', txt, tam) - tam * 0.06, y, txt: '.', fonte: 'nome', tam, cor: corPonto });
  };
  const comPonto = marca + '.';
  const t1 = caber(medir, 'nome', comPonto, max, larg);
  const partes = marca.split(' ');
  if (t1 >= 14 || partes.length < 2) {
    linha(marca, t1, yTopo + t1 * 0.76, true);
    return { cmds, altura: t1 * 0.98 };
  }
  const corte = Math.ceil(partes.length / 2);
  const l1 = partes.slice(0, corte).join(' ');
  const l2 = partes.slice(corte).join(' ');
  const t = Math.min(caber(medir, 'nome', l1, max, larg), caber(medir, 'nome', l2 + '.', max, larg));
  linha(l1, t, yTopo + t * 0.76, false);
  linha(l2, t, yTopo + t * 0.76 + t * 1.0, true);
  return { cmds, altura: t * 1.98 };
}

/** Sobretítulo: traço fino + ofício em maiúsculas pequenas. */
function sobretitulo(medir: Medir, txt: string, x: number, y: number, larg: number, cor: string): Cmd[] {
  const t = txt.toUpperCase();
  return [
    { t: 'rect', x, y: y - 2.2, w: 9, h: 0.6, cor },
    { t: 'texto', x: x + 13, y, txt: t, fonte: 'neg', tam: caber(medir, 'neg', t, 5.6, larg - 13), cor },
  ];
}

interface CoresTexto { texto: string; suave: string; acento: string }

function linhasContato(medir: Medir, d: DadosCartao, x: number, yUltima: number, larg: number, c: CoresTexto, comUrl = true): Cmd[] {
  const linhas: { txt: string; fonte: Fonte; cor: string; max: number }[] = [];
  if (d.telefone) linhas.push({ txt: d.telefone, fonte: 'nome', cor: c.texto, max: 7.6 });
  if (d.email) linhas.push({ txt: d.email, fonte: 'reg', cor: c.texto, max: 6.8 });
  if (d.comunas) linhas.push({ txt: d.comunas, fonte: 'reg', cor: c.suave, max: 6.4 });
  if (comUrl) linhas.push({ txt: d.urlCurta, fonte: 'neg', cor: c.acento, max: 6.4 });
  const lh = 9.2;
  return linhas.map((l, i) => ({
    t: 'texto' as const, x, y: yUltima - (linhas.length - 1 - i) * lh, txt: l.txt, fonte: l.fonte,
    tam: caber(medir, l.fonte, l.txt, l.max, larg), cor: l.cor,
  }));
}

function pessoa(medir: Medir, nome: string, x: number, y: number, larg: number, cor: string): Cmd {
  return { t: 'texto', x, y, txt: nome, fonte: 'neg', tam: caber(medir, 'neg', nome, 7, larg), cor };
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
function qr(url: string, x: number, y: number, tam: number, placa = true): Cmd[] {
  const { d, n } = qrPath(url);
  const pad = placa ? tam * 0.08 : 0;
  return [
    ...(placa ? [{ t: 'rect' as const, x, y, w: tam, h: tam, cor: '#FFFFFF', r: 4 }] : []),
    { t: 'path', d, x: x + pad, y: y + pad, escala: (tam - 2 * pad) / n, cor: '#15171C' },
  ];
}

const fundo = (cor: string, b: number): Cmd => ({ t: 'rect', x: -b, y: -b, w: W + 2 * b, h: H + 2 * b, cor });

export function desenharCartao(estrutura: EstruturaId, temaId: TemaId, dados: DadosCartao, medir: Medir, b = SANGRIA): Cmd[] {
  const tema: TemaCartao = TEMAS[temaId];
  const d: DadosCartao = {
    marca: limpar(dados.marca || dados.nome), nome: limpar(dados.nome), oficio: limpar(dados.oficio),
    telefone: limpar(dados.telefone), email: limpar(dados.email), comunas: limpar(dados.comunas),
    url: dados.url, urlCurta: limpar(dados.urlCurta),
  };
  const mostrarPessoa = d.nome && d.nome !== d.marca;
  const cmds: Cmd[] = [fundo(tema.fundo, b)];

  if (estrutura === 'editorial') {
    const lw = 44;
    cmds.push(...sobretitulo(medir, d.oficio, M, M + 5, W - 2 * M - lw - 10, tema.suave));
    cmds.push(...logo(W - M - lw, M - 1.5, lw, tema.logo));
    const m = blocoMarca(medir, d.marca, M, M + 16, W - 2 * M, tema.texto, tema.acento);
    cmds.push(...m.cmds);
    if (mostrarPessoa) cmds.push(pessoa(medir, d.nome, M, M + 16 + m.altura + 9, W - 2 * M, tema.suave));
    const q = 38;
    cmds.push(...linhasContato(medir, d, M, H - M, W - 2 * M - q - 12, tema));
    cmds.push(...qr(d.url, W - M - q, H - M - q, q, tema.fundo !== '#FFFFFF'));
  }

  if (estrutura === 'dividida') {
    const P = 84;
    cmds.push({ t: 'rect', x: W - P, y: -b, w: P + b, h: H + 2 * b, cor: tema.painel });
    const larg = W - P - 2 * M;
    cmds.push(...sobretitulo(medir, d.oficio, M, M + 5, larg, tema.suave));
    const m = blocoMarca(medir, d.marca, M, M + 16, larg, tema.texto, tema.acento, 17);
    cmds.push(...m.cmds);
    if (mostrarPessoa) cmds.push(pessoa(medir, d.nome, M, M + 16 + m.altura + 9, larg, tema.suave));
    cmds.push(...linhasContato(medir, d, M, H - M, larg, tema));
    const q = 50;
    cmds.push(...qr(d.url, W - P + (P - q) / 2, M + 4, q));
    const lw = 52;
    cmds.push(...logo(W - P + (P - lw) / 2, H - M - alturaLogo(lw) + 1, lw, LOGO_ESCURO));
  }

  if (estrutura === 'franja') {
    const F = 32;
    cmds.push({ t: 'rect', x: -b, y: H - F, w: W + 2 * b, h: F + b, cor: tema.painel });
    const q = 40;
    const larg = W - 2 * M - q - 10;
    cmds.push(...sobretitulo(medir, d.oficio, M, M + 5, larg, tema.suave));
    const m = blocoMarca(medir, d.marca, M, M + 16, larg, tema.texto, tema.acento, 18);
    cmds.push(...m.cmds);
    if (mostrarPessoa) cmds.push(pessoa(medir, d.nome, M, M + 16 + m.altura + 9, larg, tema.suave));
    cmds.push(...qr(d.url, W - M - q, M, q, tema.fundo !== '#FFFFFF'));
    const lw = 46;
    const larT = W - 2 * M - lw - 12;
    const contato = [d.telefone, d.email].filter(Boolean).join('   ·   ');
    if (contato) cmds.push({ t: 'texto', x: M, y: H - F + 13.5, txt: contato, fonte: 'nome', tam: caber(medir, 'nome', contato, 7, larT), cor: '#FFFFFF' });
    cmds.push({ t: 'texto', x: M, y: H - F + 23.5, txt: d.urlCurta, fonte: 'reg', tam: caber(medir, 'reg', d.urlCurta, 6.4, larT), cor: '#D9B87A' });
    cmds.push(...logo(W - M - lw, H - F / 2 - alturaLogo(lw) / 2, lw, LOGO_ESCURO));
  }

  if (estrutura === 'punto') {
    // o ponto do logo, grande, saindo pela direita
    const r = 52;
    cmds.push({ t: 'circ', cx: W - 22, cy: H / 2 + 4, r, cor: tema.circulo });
    const q = 42;
    cmds.push(...qr(d.url, W - 22 - q / 2 - 6, H / 2 + 4 - q / 2, q));
    const lw = 42;
    cmds.push(...logo(M, H - M - alturaLogo(lw) + 1, lw, tema.logo));
    const larg = W - 2 * M - 92;
    cmds.push(...sobretitulo(medir, d.oficio, M, M + 5, larg + 30, tema.suave));
    const m = blocoMarca(medir, d.marca, M, M + 16, larg + 10, tema.texto, tema.acento, 18);
    cmds.push(...m.cmds);
    if (mostrarPessoa) cmds.push(pessoa(medir, d.nome, M, M + 16 + m.altura + 9, larg, tema.suave));
    cmds.push(...linhasContato(medir, d, M, H - M - 16, larg + 8, tema, false));
  }

  return cmds;
}
