// Ações no fim da página do profissional: compartilhar a página, compartilhar a tarjeta (imagem)
// e baixar o PDF para imprimir.
import { useState } from 'react';
import type { DadosCartao, EstruturaId } from './desenho';
import type { TemaId } from './temas';

export default function AcoesCartao({ dados, estrutura, tema }: { dados: DadosCartao; estrutura: EstruturaId; tema: TemaId }) {
  const [estado, setEstado] = useState('');
  const base = dados.urlCurta.split('/').pop() || 'tarjeta';
  const texto = `${dados.marca} · ${dados.oficio}`;

  function baixar(blob: Blob, nome: string) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nome;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  async function compartilharPagina() {
    setEstado('');
    if (navigator.share) {
      try { await navigator.share({ title: dados.marca, text: texto, url: dados.url }); } catch { /* cancelado */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(dados.url);
      setEstado('Enlace copiado. Pégalo en WhatsApp o donde quieras.');
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${dados.url}`)}`, '_blank', 'noopener');
    }
  }

  async function compartilharTarjeta() {
    setEstado('Preparando la tarjeta…');
    try {
      const { gerarPngCartao } = await import('./imagem');
      const png = await gerarPngCartao(dados, estrutura, tema);
      const arquivo = new File([png], `tarjeta-${base}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [arquivo] })) {
        setEstado('');
        try { await navigator.share({ files: [arquivo], title: dados.marca, text: `${texto} · ${dados.url}` }); } catch { /* cancelado */ }
        return;
      }
      baixar(png, arquivo.name);
      setEstado('Tarjeta descargada como imagen. Envíala por WhatsApp o donde quieras.');
    } catch (e) {
      console.error(e);
      setEstado('No se pudo preparar la tarjeta. Inténtalo de nuevo.');
    }
  }

  async function baixarPdf() {
    setEstado('Generando PDF…');
    try {
      const { gerarPdfCartao } = await import('./gerarPdf');
      const bytes = await gerarPdfCartao(dados, estrutura, tema, 'imprenta');
      baixar(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `tarjeta-${base}.pdf`);
      setEstado('');
    } catch {
      setEstado('No se pudo generar el PDF. Inténtalo de nuevo.');
    }
  }

  return (
    <div className="ac">
      <button type="button" className="btn ac-principal" onClick={compartilharPagina}>Compartir página</button>
      <button type="button" className="btn btn-ghost" onClick={compartilharTarjeta}>Compartir tarjeta</button>
      <button type="button" className="ac-link" onClick={baixarPdf}>Descargar PDF para imprimir</button>
      {estado && <p className="ac-estado" role="status">{estado}</p>}
      <style>{`
        .ac{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        .ac-principal{background:var(--fundo-escuro);color:#fff}.ac-principal:hover{background:var(--fundo-escuro-hover)}
        .ac-link{width:100%;text-align:left;background:none;border:0;padding:4px 0;font:inherit;font-size:.9rem;color:var(--muted);text-decoration:underline;cursor:pointer}
        .ac-link:hover{color:var(--ink)}
        .ac-estado{width:100%;margin:0;color:var(--muted);font-size:.9rem}
      `}</style>
    </div>
  );
}
