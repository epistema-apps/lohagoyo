import { useState } from 'react';
import type { DadosCartao, ModeloCartao, SaidaCartao } from './gerarPdf';

const modelos: { id: ModeloCartao; nome: string }[] = [
  { id: 'clasico', nome: 'Clásico' },
  { id: 'color', nome: 'Color' },
  { id: 'minimo', nome: 'Mínimo' },
];

export default function GeradorCartao({ dados }: { dados: DadosCartao }) {
  const [modelo, setModelo] = useState<ModeloCartao>('clasico');
  const [gerando, setGerando] = useState<SaidaCartao | null>(null);
  const [erro, setErro] = useState('');

  async function baixar(saida: SaidaCartao) {
    setGerando(saida);
    setErro('');
    try {
      const { gerarPdfCartao } = await import('./gerarPdf'); // carrega só ao clicar
      const bytes = await gerarPdfCartao(dados, modelo, saida);
      const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const base = dados.urlCurta.split('/').pop() || 'tarjeta';
      a.download = `tarjeta-${base}-${modelo}-${saida === 'a4' ? 'hoja-a4' : '9x5'}.pdf`;
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
      <fieldset className="gc-modelos">
        <legend>Modelo</legend>
        {modelos.map((m) => (
          <label key={m.id} className={`gc-modelo${modelo === m.id ? ' ativo' : ''}`}>
            <input type="radio" name="modelo" value={m.id} checked={modelo === m.id} onChange={() => setModelo(m.id)} />
            <Previa modelo={m.id} dados={dados} />
            <span>{m.nome}</span>
          </label>
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

/** Prévia aproximada em HTML (o PDF é a versão final). */
function Previa({ modelo, dados }: { modelo: ModeloCartao; dados: DadosCartao }) {
  const cor = dados.cor;
  if (modelo === 'color')
    return (
      <span className="pv" style={{ background: cor, color: '#fff' }}>
        <small>{dados.oficio}</small>
        <b>{dados.nome}</b>
        <i className="pv-qr" style={{ background: '#fff' }} />
      </span>
    );
  if (modelo === 'minimo')
    return (
      <span className="pv pv-centro">
        <b>{dados.nome}</b>
        <small style={{ color: cor }}>{dados.oficio}</small>
      </span>
    );
  return (
    <span className="pv" style={{ borderLeft: `6px solid ${cor}` }}>
      <b>{dados.nome}</b>
      <small style={{ color: cor }}>{dados.oficio}</small>
      <i className="pv-qr" />
    </span>
  );
}

const css = `
.gc-modelos { border: 0; padding: 0; margin: 0 0 16px; display: flex; gap: 12px; flex-wrap: wrap; }
.gc-modelos legend { font-weight: 700; margin-bottom: 8px; }
.gc-modelo { cursor: pointer; display: flex; flex-direction: column; gap: 6px; align-items: center; font-weight: 700; font-size: .9rem; }
.gc-modelo input { position: absolute; opacity: 0; pointer-events: none; }
.gc-modelo .pv { outline: 2px solid transparent; outline-offset: 3px; }
.gc-modelo.ativo .pv { outline-color: var(--accent); }
.gc-modelo:has(input:focus-visible) .pv { outline-color: var(--ink); }
.pv { position: relative; width: 162px; height: 90px; border-radius: 4px; background: #fff; border: 1px solid var(--line);
  display: flex; flex-direction: column; justify-content: center; padding: 10px 12px; box-shadow: var(--shadow); overflow: hidden; text-align: left; }
.pv b { font-size: .85rem; line-height: 1.1; }
.pv small { font-size: .55rem; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; }
.pv-centro { align-items: center; text-align: center; }
.pv-qr { position: absolute; right: 8px; bottom: 8px; width: 30px; height: 30px; background:
  repeating-linear-gradient(90deg, #1d2433 0 3px, #fff 3px 6px), #fff; opacity: .7; border-radius: 2px; }
.gc-botoes { display: flex; gap: 10px; flex-wrap: wrap; }
.gc-erro { color: #b00020; margin-top: 8px; }
`;
