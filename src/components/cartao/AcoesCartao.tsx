// Botões da tarjeta na página pública do profissional: baixar o PDF e compartilhar.
import { useState } from 'react';
import type { DadosCartao, EstruturaId } from './desenho';
import type { TemaId } from './temas';

export default function AcoesCartao({ dados, estrutura, tema }: { dados: DadosCartao; estrutura: EstruturaId; tema: TemaId }) {
  const [estado, setEstado] = useState('');

  async function baixar() {
    setEstado('Generando…');
    try {
      const { gerarPdfCartao } = await import('./gerarPdf');
      const bytes = await gerarPdfCartao(dados, estrutura, tema, 'imprenta');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
      a.download = `tarjeta-${dados.urlCurta.split('/').pop()}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setEstado('');
    } catch {
      setEstado('No se pudo generar. Inténtalo de nuevo.');
    }
  }

  async function compartilhar() {
    const texto = `${dados.marca} · ${dados.oficio}`;
    if (navigator.share) {
      try { await navigator.share({ title: dados.marca, text: texto, url: dados.url }); } catch { /* cancelado */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(dados.url);
      setEstado('Enlace copiado.');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${dados.url}`)}`, '_blank', 'noopener');
    }
  }

  return (
    <div className="ac">
      <button type="button" className="btn btn-escuro-sem" onClick={compartilhar}>Compartir</button>
      <button type="button" className="btn btn-ghost" onClick={baixar}>Descargar tarjeta</button>
      {estado && <span className="ac-estado" role="status">{estado}</span>}
      <style>{`.ac{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.btn-escuro-sem{background:var(--ink);color:#fff}.btn-escuro-sem:hover{background:#000}.ac-estado{color:var(--muted);font-size:.9rem}`}</style>
    </div>
  );
}
