// Conversa privada entre a moderação e o profissional sobre uma avaliação.
import { useEffect, useRef, useState } from 'react';
import { enviarMensagem, listarMensagens, type Mensagem } from '../../dados/painel';

export default function Conversa({ avaliacaoId, autor, autorUid }: { avaliacaoId: string; autor: 'admin' | 'profissional'; autorUid: string }) {
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fim = useRef<HTMLDivElement>(null);

  const carregar = () => listarMensagens(avaliacaoId).then(setMsgs).catch(() => setErro('No se pudo cargar la conversación.'));
  useEffect(() => { carregar(); }, [avaliacaoId]);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest' }); }, [msgs?.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setErro('');
    try {
      await enviarMensagem(avaliacaoId, autor, autorUid, texto);
      setTexto('');
      await carregar();
    } catch {
      setErro('No se pudo enviar. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  const rotulo = (a: Mensagem['autor']) => (a === autor ? 'Tú' : a === 'admin' ? 'LoHagoYo' : 'Profesional');

  return (
    <div className="cv">
      <div className="cv-lista">
        {msgs === null && <p className="pn-dica">Cargando…</p>}
        {msgs?.length === 0 && <p className="pn-dica">Todavía no hay mensajes. {autor === 'admin' ? 'Escribe para pedir una explicación antes de publicar.' : ''}</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`cv-msg ${m.autor === autor ? 'meu' : ''}`}>
            <span>{rotulo(m.autor)} · {new Date(m.criadoEm).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</span>
            <p>{m.texto}</p>
          </div>
        ))}
        <div ref={fim} />
      </div>
      <form onSubmit={enviar} className="cv-form">
        <textarea rows={2} value={texto} maxLength={2000} placeholder="Escribe un mensaje…" onChange={(e) => setTexto(e.target.value)} />
        <button className="btn btn-primary btn-sm" disabled={enviando || !texto.trim()}>{enviando ? 'Enviando…' : 'Enviar'}</button>
      </form>
      {erro && <p className="pn-erro">{erro}</p>}
      <p className="pn-dica" style={{ margin: 0 }}>{autor === 'admin' ? 'El profesional recibe un aviso por correo y responde en su panel.' : 'Tu respuesta queda registrada.'}</p>
    </div>
  );
}
