// Tarjeta como imagem PNG no navegador (para compartilhar no WhatsApp etc.).
// Usa o mesmo desenho do PDF; as fontes vão embutidas no SVG para o canvas desenhar igual.
import { desenharCartao, H, W, type DadosCartao, type EstruturaId, type Medir } from './desenho';
import { cartaoSvg } from './render-svg';
import type { TemaId } from './temas';

const FONTES_CSS: Record<string, string> = {
  nome: "700 10px 'Plus Jakarta Sans'",
  reg: "400 10px 'Atkinson Hyperlegible'",
  neg: "700 10px 'Atkinson Hyperlegible'",
};

/** Mede o texto com as fontes já carregadas pela página. */
export async function criarMedidorCanvas(): Promise<Medir> {
  await Promise.all(Object.values(FONTES_CSS).map((f) => document.fonts.load(f, 'Aá0')));
  const ctx = document.createElement('canvas').getContext('2d')!;
  const cache = new Map<string, number>();
  return (fonte, txt, tam) => {
    const k = fonte + '|' + txt;
    let w = cache.get(k);
    if (w == null) {
      ctx.font = FONTES_CSS[fonte];
      w = ctx.measureText(txt).width / 10;
      cache.set(k, w);
    }
    return w * tam;
  };
}

async function base64(url: string): Promise<string> {
  const b = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

let fontesEmbutidas: Promise<string> | null = null;
function estiloFontes(): Promise<string> {
  fontesEmbutidas ??= Promise.all([
    base64('/fonts/plus-jakarta-sans-latin-700-normal.woff2'),
    base64('/fonts/atkinson-hyperlegible-latin-400-normal.woff2'),
    base64('/fonts/atkinson-hyperlegible-latin-700-normal.woff2'),
  ]).then(([j7, a4, a7]) => `<style>
    @font-face{font-family:'Plus Jakarta Sans';font-weight:700;src:url(data:font/woff2;base64,${j7}) format('woff2')}
    @font-face{font-family:'Atkinson Hyperlegible';font-weight:400;src:url(data:font/woff2;base64,${a4}) format('woff2')}
    @font-face{font-family:'Atkinson Hyperlegible';font-weight:700;src:url(data:font/woff2;base64,${a7}) format('woff2')}
  </style>`);
  return fontesEmbutidas;
}

/** PNG da tarjeta, com margem e sombra suaves (ficha pronta para mandar). */
export async function gerarPngCartao(dados: DadosCartao, estrutura: EstruturaId, tema: TemaId, largura = 1200): Promise<Blob> {
  const medir = await criarMedidorCanvas();
  const svg = cartaoSvg(desenharCartao(estrutura, tema, dados, medir, 0), 'png').replace('<defs>', `<defs>${await estiloFontes()}`);
  const img = new Image();
  img.decoding = 'sync';
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    img.src = url;
    await img.decode();
    const margem = Math.round(largura * 0.06);
    const w = largura - 2 * margem;
    const h = Math.round((w * H) / W);
    const c = document.createElement('canvas');
    c.width = largura;
    c.height = h + 2 * margem;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#e6e6e4';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.shadowColor = 'rgba(26, 25, 24, 0.25)';
    ctx.shadowBlur = margem * 0.6;
    ctx.shadowOffsetY = margem * 0.2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(margem, margem, w, h);
    ctx.shadowColor = 'transparent';
    ctx.drawImage(img, margem, margem, w, h);
    return await new Promise<Blob>((ok, erro) => c.toBlob((b) => (b ? ok(b) : erro(new Error('png'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}
