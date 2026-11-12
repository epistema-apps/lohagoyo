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

/** Mede o texto com as mesmas fontes, já carregadas pelo navegador (rápido). */
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
  const [estrutura, setEstrutura] = useState<EstruturaId>('editorial');
  const [tema, setTema] = useState<TemaId>('blanco');
  const [medir, setMedir] = useState<Medir | null>(null);
  const [gerando, setGerando] = useState<SaidaCartao | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    criarMedidorCanvas()
      .then((fn) => vivo && setMedir(() => fn))
      .catch(() => vivo && setErro('No se pudo cargar la vista previa.'));
    return () => { vivo = false; };
  }, []);

  const principal = useMemo(
    () => (medir ? cartaoSvg(desenharCartao(estrutura, tema, dados, medir, 0), 'gc-grande') : null),
    [medir, estrutura, tema, dados],
  );
  const miniaturas = useMemo(
    () => (medir ? ESTRUTURAS.map((e) => ({ ...e, svg: cartaoSvg(desenharCartao(e.id, tema, dados, medir, 0), `gc-${e.id}`) })) : null),
    [medir, tema, dados],
  );

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
      a.download = `tarjeta-${base}-${estrutura}-${tema}-${saida === 'a4' ? 'hoja-a4' : '9x5cm'}.pdf`;
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
      <div className="gc-palco">
        <div className="gc-mesa">
          {principal
            ? <div className="gc-grande" dangerouslySetInnerHTML={{ __html: principal }} />
            : <div className="gc-grande gc-carregando" />}
        </div>
        <p className="gc-medida">Tamaño real: 9 × 5 cm</p>
      </div>

      <div className="gc-painel">
        <section>
          <h3>Diseño</h3>
          <div className="gc-estruturas" role="radiogroup" aria-label="Diseño">
            {ESTRUTURAS.map((e, i) => (
              <button
                key={e.id} type="button" role="radio" aria-checked={estrutura === e.id}
                className={`gc-estrutura${estrutura === e.id ? ' ativo' : ''}`} onClick={() => setEstrutura(e.id)}
              >
                {miniaturas
                  ? <span className="gc-mini" dangerouslySetInnerHTML={{ __html: miniaturas[i].svg }} />
                  : <span className="gc-mini gc-carregando" />}
                <span>{e.nome}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3>Color</h3>
          <div className="gc-cores" role="radiogroup" aria-label="Color">
            {temas.map((t) => (
              <button
                key={t.id} type="button" role="radio" aria-checked={tema === t.id} title={t.nome}
                className={`gc-cor${tema === t.id ? ' ativo' : ''}`} onClick={() => setTema(t.id)}
              >
                <span className="gc-amostra" style={{ background: t.fundo }}><i style={{ background: t.acento }} /></span>
                <span>{t.nome}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="gc-baixar">
          <h3>Descargar</h3>
          <button className="btn btn-primary" onClick={() => baixar('imprenta')} disabled={!!gerando}>
            {gerando === 'imprenta' ? 'Generando…' : 'PDF para imprenta'}
          </button>
          <p className="gc-ajuda">9 × 5 cm con sangrado de 3 mm y marcas de corte. Llévalo a cualquier imprenta.</p>
          <button className="btn btn-ghost" onClick={() => baixar('a4')} disabled={!!gerando}>
            {gerando === 'a4' ? 'Generando…' : 'Hoja A4 con 10 tarjetas'}
          </button>
          <p className="gc-ajuda">Para imprimir en casa al 100% y cortar.</p>
          {erro && <p role="alert" className="gc-erro">{erro}</p>}
        </section>
      </div>
      <style>{css}</style>
    </div>
  );
}

const css = `
.gc { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 1fr); gap: clamp(24px, 4vw, 56px); align-items: start; }
@media (max-width: 880px) { .gc { grid-template-columns: 1fr; } }
.gc h3 { margin: 0 0 12px; font-size: .74rem; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.gc-palco { position: sticky; top: 24px; }
.gc-mesa { background: linear-gradient(160deg, #ecebe7, #dedcd6); border-radius: 22px; padding: clamp(28px, 7vw, 72px); display: grid; place-items: center; }
.gc-grande { width: 100%; max-width: 560px; aspect-ratio: 90 / 50; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(21,23,28,.08), 0 24px 50px rgba(21,23,28,.22); transform: rotate(-1.2deg); }
.gc-grande svg, .gc-mini svg { display: block; width: 100%; height: 100%; }
.gc-medida { margin: 10px 0 0; text-align: center; font-size: .82rem; color: var(--muted); }
.gc-painel { display: grid; gap: 28px; }
.gc-estruturas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.gc-estrutura, .gc-cor { font: inherit; background: none; border: 0; padding: 0; cursor: pointer; color: var(--ink); text-align: left; }
.gc-estrutura { display: flex; flex-direction: column; gap: 6px; font-weight: 700; font-size: .88rem; }
.gc-mini { display: block; aspect-ratio: 90 / 50; border-radius: 4px; overflow: hidden; box-shadow: 0 0 0 1px var(--line); transition: box-shadow .15s ease; }
.gc-estrutura.ativo .gc-mini { box-shadow: 0 0 0 2px var(--ink); }
.gc-estrutura:focus-visible .gc-mini, .gc-cor:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
.gc-cores { display: flex; flex-wrap: wrap; gap: 8px; }
.gc-cor { display: flex; align-items: center; gap: 8px; padding: 6px 14px 6px 6px; border: 1px solid var(--line); border-radius: 999px; font-weight: 700; font-size: .88rem; }
.gc-cor.ativo { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
.gc-amostra { position: relative; width: 24px; height: 24px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); overflow: hidden; }
.gc-amostra i { position: absolute; right: 4px; bottom: 4px; width: 7px; height: 7px; border-radius: 50%; }
.gc-baixar { display: grid; gap: 6px; justify-items: start; }
.gc-baixar .btn { width: 100%; }
.gc-ajuda { margin: 0 0 10px; font-size: .84rem; color: var(--muted); }
.gc-carregando { background: linear-gradient(90deg, #eceae5, #f6f5f2, #eceae5); }
.gc-erro { color: #b00020; }
`;
