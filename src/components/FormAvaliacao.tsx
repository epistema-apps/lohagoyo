// Formulário público de avaliação. Fica "por confirmar" até a pessoa clicar no link do e-mail;
// depois passa pela moderação de LoHagoYo.cl antes de aparecer.
import { useState } from 'react';

export default function FormAvaliacao({ perfilId, nome: nomeProfissional, aberto = false }: { perfilId: string; nome: string; aberto?: boolean }) {
  const [abrir, setAbrir] = useState(aberto);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [nota, setNota] = useState(0);
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState<'livre' | 'enviando' | 'ok' | 'erro'>('livre');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nota) return;
    setEstado('enviando');
    try {
      const { enviarAvaliacao } = await import('../dados/painel');
      await enviarAvaliacao({ perfilId, nome, email, nota, texto });
      setEstado('ok');
    } catch {
      setEstado('erro');
    }
  }

  return <div className="fa-raiz"><style>{css}</style>{conteudo()}</div>;

  function conteudo() {
  if (estado === 'ok') {
    return (
      <div className="fa-ok">
        <strong>¡Gracias!</strong> Te enviamos un correo a {email}. Abre el enlace del correo para confirmar y publicar tu opinión.
      </div>
    );
  }
  if (!abrir) {
    return (
      <div className="fa-cta">
        <div>
          <p className="fa-sobre"><span />Tu opinión</p>
          <h3>¿Trabajaste con {nomeProfissional}<span className="fa-ponto">?</span></h3>
          <p>Cuéntanos cómo fue. Tu opinión ayuda a otros vecinos a elegir y a {nomeProfissional} a seguir creciendo.</p>
        </div>
        <button type="button" className="btn fa-botao" onClick={() => setAbrir(true)}>Dejar mi opinión <span aria-hidden="true">★</span></button>
      </div>
    );
  }
  return (
    <form className="fa" onSubmit={enviar}>
      <fieldset className="fa-notas">
        <legend>Tu nota</legend>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} de 5`} aria-pressed={nota >= n} className={nota >= n ? 'on' : ''} onClick={() => setNota(n)}>★</button>
        ))}
      </fieldset>
      <label>Tu nombre<input required maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>
      <label>Tu correo (no se publica)<input required type="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
      <label>Tu comentario<textarea rows={4} maxLength={1000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="¿Cómo fue el servicio?" /></label>
      <button className="btn fa-enviar" disabled={!nota || estado === 'enviando'}>{estado === 'enviando' ? 'Enviando…' : 'Enviar opinión'}</button>
      {estado === 'erro' && <p className="fa-erro">No se pudo enviar. Inténtalo de nuevo.</p>}
      <p className="fa-nota">Recibirás un correo para confirmar tu opinión; al confirmarla se publica. LoHagoYo.cl puede retirar opiniones falsas u ofensivas. Al enviar aceptas los <a href="/terminos/">Términos</a> y la <a href="/privacidad/">Política de Privacidad</a>.</p>
    </form>
  );
  }
}

const css = `
        .fa{display:grid;gap:12px;max-width:560px}
        .fa label{display:grid;gap:6px;font-weight:700;font-size:.92rem}
        .fa input,.fa textarea{padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:1rem var(--font-body);background:#fff}
        .fa-notas{border:0;padding:0;margin:0;display:flex;gap:4px;align-items:center}
        .fa-notas legend{font-weight:700;font-size:.92rem;margin-bottom:6px}
        .fa-notas button{font-size:1.8rem;line-height:1;background:none;border:0;cursor:pointer;color:#d4d1ca;padding:2px}
        .fa-notas button.on{color:var(--accent)}
        .fa-enviar{background:var(--fundo-escuro);color:#fff;justify-self:start}
        .fa-nota{color:var(--muted);font-size:.84rem;margin:0}
        .fa-erro{color:#a32020;margin:0}
        .fa-ok{background:var(--bg);border-radius:12px;padding:16px}
        .fa-convite{font:inherit;background:none;border:1px dashed var(--line);border-radius:12px;padding:14px 18px;cursor:pointer;color:var(--muted);text-align:left}
        .fa-convite span{color:var(--ink);font-weight:700}
        .fa-convite:hover{border-color:var(--ink)}
      
  .fa-raiz{margin-top:8px}
  .fa-cta{display:flex;justify-content:space-between;align-items:center;gap:24px;flex-wrap:wrap;background:var(--grafite-claro);border-radius:24px;padding:clamp(24px,5vw,44px)}
  .fa-cta h3{font-size:clamp(1.6rem,4vw,2.3rem);letter-spacing:-.045em;line-height:1.05;margin:0 0 .4em}
  .fa-cta p{color:var(--muted);margin:0;max-width:48ch}
  .fa-sobre{display:flex;align-items:center;gap:12px;font-size:.74rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase;margin:0 0 14px!important}
  .fa-sobre span{width:28px;height:1px;background:currentColor}
  .fa-ponto{color:var(--accent)}
  .fa-botao{background:var(--fundo-escuro);color:#fff;min-height:54px;padding:0 28px;font-size:1.02rem}
  .fa-botao span{color:var(--sol)}
  .fa-botao:hover{background:var(--fundo-escuro-hover)}
  .fa{background:var(--grafite-claro);border-radius:24px;padding:clamp(24px,5vw,44px)}
`;
