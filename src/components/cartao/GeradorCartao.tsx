import { useEffect, useMemo, useState } from 'react';
import { desenharCartao, ESTRUTURAS, type DadosCartao, type EstruturaId, type Medir } from './desenho';
import { cartaoSvg } from './render-svg';
import { TEMAS, type TemaId } from './temas';
import type { SaidaCartao } from './gerarPdf';

const temas = Object.values(TEMAS);

const FONTES_CSS: Record<string, string> = {
  nome: "700 10px 'Plus Jakarta Sans'",
  reg: "400 10px 'Atkinson Hyperlegible'",
  neg: "700 10px 'Atkinson Hyperlegible'",
};

async function criarMedidorCanvas(): Promise<Medir> {
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

export default function GeradorCartao({ dados }: { dados: DadosCartao }) {
  const [estrutura, setEstrutura] = useState<EstruturaId>('clasica');
  const [tema, setTema] = useState<TemaId>('grafito');
  const [medir, setMedir] = useState<Medir | null>(null);
  const [gerando, setGerando] = useState<SaidaCartao | null>(null);
  const [erro, setErro] = useState('');

  // Prévia: mede o texto com as mesmas fontes, já carregadas pelo navegador (rápido).
  useEffect(() => {
    let vivo = true;
    criarMedidorCanvas()
      .then((fn) => vivo && setMedir(() => fn))
      .catch(() => vivo && setErro('No se pudo cargar la vista previa.'));
    return () => { vivo = false; };
  }, []);

  const previas = useMemo(() => {
    if (!medir) return null;
    return ESTRUTURAS.map((e) => ({ ...e, svg: cartaoSvg(desenharCartao(e.id, tema, dados, medir, 0), `cl-${e.id}`) }));
  }, [medir, tema, dados]);

  async function baixar(saida: SaidaCartao) {
    setGerando(saida);
    setErro('');
    try {
      const { gerarPdfCartao } = await import('./gerarPdf');
      const bytes = await gerarPdfCartao(dados, estrutura, tema, saida);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const base = dados.urlCurta.split('/').pop() || 'tarjeta';
      a.download = `tarjeta-${base}-${estrutura}-${tema}-${saida === 'a4' ? 'hoja-a4' : '9x5'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e) {
      console.error(e);
      setErro('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setGerando(null);
    }
  }

  return (
    <div className="gc">
      <fieldset className="gc-cores">
        <legend>Color</legend>
        {temas.map((t) => (
          <label key={t.id} className={`gc-cor${tema === t.id ? ' ativo' : ''}`} title={t.nome}>
            <input type="radio" name="tema" value={t.id} checked={tema === t.id} onChange={() => setTema(t.id)} />
            <span className="gc-amostra" style={{ background: t.fundo }}>
              <i style={{ background: t.acento }} />
            </span>
            <span>{t.nome}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="gc-estruturas">
        <legend>Diseño</legend>
        {previas
          ? previas.map((p) => (
              <label key={p.id} className={`gc-estrutura${estrutura === p.id ? ' ativo' : ''}`}>
                <input type="radio" name="estrutura" value={p.id} checked={estrutura === p.id} onChange={() => setEstrutura(p.id)} />
                <span className="gc-previa" dangerouslySetInnerHTML={{ __html: p.svg }} />
                <span>{p.nome}</span>
              </label>
            ))
          : ESTRUTURAS.map((e) => (
              <span key={e.id} className="gc-estrutura">
                <span className="gc-previa gc-carregando" />
                <span>{e.nome}</span>
              </span>
            ))}
      </fieldset>

      <div className="gc-botoes">
        <button className="btn btn-primary" onClick={() => baixar('imprenta')} disabled={!!gerando}>
          {gerando === 'imprenta' ? 'Generando…' : 'PDF para imprenta (9 × 5 cm)'}
        </button>
        <button className="btn btn-ghost" onClick={() => baixar('a4')} disabled={!!gerando}>
          {gerando === 'a4' ? 'Generando…' : 'Hoja A4 con 10 tarjetas'}
        </button>
      </div>
      {erro && <p role="alert" className="gc-erro">{erro}</p>}
      <style>{css}</style>
    </div>
  );
}

const css = `
.gc fieldset { border: 0; padding: 0; margin: 0 0 18px; display: flex; flex-wrap: wrap; gap: 12px; }
.gc legend { font-weight: 700; margin-bottom: 8px; }
.gc input[type=radio] { position: absolute; opacity: 0; pointer-events: none; }
.gc-cor { cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 6px; border: 1px solid var(--line); border-radius: 999px; background: #fff; font-weight: 700; font-size: .9rem; }
.gc-cor.ativo { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.gc-amostra { position: relative; width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(0,0,0,.12); overflow: hidden; }
.gc-amostra i { position: absolute; right: 3px; bottom: 3px; width: 8px; height: 8px; border-radius: 50%; }
.gc-estruturas { display: grid !important; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }
.gc-estrutura { cursor: pointer; display: flex; flex-direction: column; gap: 6px; font-weight: 700; font-size: .9rem; }
.gc-previa { display: block; aspect-ratio: 90 / 50; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 6px rgba(14,18,48,.15); outline: 2px solid transparent; outline-offset: 3px; }
.gc-previa svg { display: block; width: 100%; height: 100%; }
.gc-estrutura.ativo .gc-previa { outline-color: var(--accent); }
.gc-estrutura:has(input:focus-visible) .gc-previa, .gc-cor:has(input:focus-visible) { outline: 3px solid var(--ink); }
.gc-carregando { background: linear-gradient(90deg, #eceef6, #f6f7fb, #eceef6); }
.gc-botoes { display: flex; gap: 10px; flex-wrap: wrap; }
.gc-erro { color: #b00020; margin-top: 8px; }
`;
