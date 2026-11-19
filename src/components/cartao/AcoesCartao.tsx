// Ações no fim da página do profissional: compartilhar a página, compartilhar a tarjeta (imagem)
// e baixar o PDF para imprimir.
import { useEffect, useRef, useState } from 'react';
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

  // A imagem é preparada antes do toque: no celular o "compartir" só abre se for chamado
  // logo após o toque (se esperar gerar a imagem, o navegador recusa em silêncio).
  const png = useRef<Promise<File> | null>(null);
  const pronto = useRef<File | null>(null);
  function prepararPng(): Promise<File> {
    png.current ??= import('./imagem')
      .then(({ gerarPngCartao }) => gerarPngCartao(dados, estrutura, tema))
      .then((b) => (pronto.current = new File([b], `tarjeta-${base}.png`, { type: 'image/png' })))
      .catch((e) => { png.current = null; throw e; });
    return png.current;
  }
  useEffect(() => {
    const id = setTimeout(() => { prepararPng().catch(() => {}); }, 600);
    return () => clearTimeout(id);
  }, []);

  async function compartilharTarjeta() {
    let arquivo = pronto.current;
    if (!arquivo) {
      setEstado('Preparando la tarjeta…');
      try { arquivo = await prepararPng(); } catch (e) {
        console.error(e);
        setEstado('No se pudo preparar la tarjeta. Inténtalo de nuevo.');
        return;
      }
    }
    if (navigator.canShare?.({ files: [arquivo] })) {
      try {
        await navigator.share({ files: [arquivo], title: dados.marca, text: `${texto} · ${dados.url}` });
        setEstado('');
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') { setEstado(''); return; } // a pessoa cancelou
        // tempo do toque expirou (a imagem demorou): já está pronta, basta tocar de novo
        setEstado('La tarjeta está lista. Toca "Compartir tarjeta" otra vez.');
      }
      return;
    }
    baixar(arquivo, arquivo.name);
    setEstado('Tarjeta descargada como imagen. Envíala por WhatsApp o donde quieras.');
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
