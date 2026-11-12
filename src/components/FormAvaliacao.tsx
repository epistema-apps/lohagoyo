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

  if (estado === 'ok') {
    return (
      <div className="fa-ok">
        <strong>¡Gracias!</strong> Te enviamos un correo a {email}. Confirma tu opinión con el enlace del correo; luego la revisaremos antes de publicarla.
      </div>
    );
  }
  if (!abrir) {
    return (
      <button type="button" className="fa-convite" onClick={() => setAbrir(true)}>
        ¿Trabajaste con {nomeProfissional}? <span>Deja tu opinión →</span>
      </button>
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
      <p className="fa-nota">Recibirás un correo para confirmar. Todas las opiniones son revisadas por LoHagoYo.cl antes de publicarse.</p>
      <style>{`
        .fa{display:grid;gap:12px;max-width:560px}
        .fa label{display:grid;gap:6px;font-weight:700;font-size:.92rem}
        .fa input,.fa textarea{padding:10px 12px;border:1px solid var(--line);border-radius:8px;font:1rem var(--font-body);background:#fff}
        .fa-notas{border:0;padding:0;margin:0;display:flex;gap:4px;align-items:center}
        .fa-notas legend{font-weight:700;font-size:.92rem;margin-bottom:6px}
        .fa-notas button{font-size:1.8rem;line-height:1;background:none;border:0;cursor:pointer;color:#d4d1ca;padding:2px}
        .fa-notas button.on{color:var(--accent)}
        .fa-enviar{background:var(--ink);color:#fff;justify-self:start}
        .fa-nota{color:var(--muted);font-size:.84rem;margin:0}
        .fa-erro{color:#a32020;margin:0}
        .fa-ok{background:var(--bg);border-radius:12px;padding:16px}
        .fa-convite{font:inherit;background:none;border:1px dashed var(--line);border-radius:12px;padding:14px 18px;cursor:pointer;color:var(--muted);text-align:left}
        .fa-convite span{color:var(--ink);font-weight:700}
        .fa-convite:hover{border-color:var(--ink)}
      `}</style>
    </form>
  );
}
