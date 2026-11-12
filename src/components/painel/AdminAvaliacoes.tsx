// Aba "Evaluaciones" do admin: moderar, conversar com o profissional, publicar, editar, apagar, inserir.
import { useEffect, useMemo, useState } from 'react';
import {
  apagarAvaliacao, atualizarAvaliacao, criarAvaliacaoAdmin, listarAvaliacoesAdmin, type AvaliacaoAdmin,
} from '../../dados/painel';
import type { Perfil, StatusAvaliacao } from '../../dominio/tipos';
import Conversa from './Conversa';

const FILTROS: { id: StatusAvaliacao | 'todas'; nome: string }[] = [
  { id: 'pendiente', nome: 'Por revisar' }, { id: 'en_contestacion', nome: 'Con el profesional' },
  { id: 'aprobada', nome: 'Publicadas' }, { id: 'por_confirmar', nome: 'Sin confirmar correo' },
  { id: 'rechazada', nome: 'Rechazadas' }, { id: 'todas', nome: 'Todas' },
];
const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function AdminAvaliacoes({ perfis, moderadorUid }: { perfis: Perfil[]; moderadorUid: string }) {
  const [itens, setItens] = useState<AvaliacaoAdmin[] | null>(null);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('pendiente');
  const [aberta, setAberta] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [nova, setNova] = useState(false);
  const [aviso, setAviso] = useState('');

  const nomePerfil = useMemo(() => new Map(perfis.map((p) => [p.id, p.marca || p.nomePublico])), [perfis]);
  const carregar = () => listarAvaliacoesAdmin().then(setItens).catch(() => setAviso('No se pudieron cargar las evaluaciones.'));
  useEffect(() => { carregar(); }, []);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: itens?.length ?? 0 };
    itens?.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [itens]);

  async function mudar(id: string, status: StatusAvaliacao, msg: string) {
    await atualizarAvaliacao(id, { status });
    setAviso(msg);
    await carregar();
  }

  return (
    <div>
      <div className="md-filtros" style={{ marginTop: 16 }}>
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`pn-chip${filtro === f.id ? ' ativo' : ''}`} onClick={() => setFiltro(f.id)}>
            {f.nome} ({contagem[f.id] ?? 0})
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNova(!nova)}>+ Agregar evaluación</button>
      </div>
      {aviso && <p className="pn-msg pn-msg-ok" style={{ marginTop: 12 }} role="status">{aviso}</p>}
      {nova && <NovaAvaliacao perfis={perfis} aoSalvar={async (a) => { await criarAvaliacaoAdmin(a); setNova(false); setAviso('Evaluación agregada.'); carregar(); }} />}

      <div className="av-lista" style={{ marginTop: 16 }}>
        {itens === null && <p className="pn-dica">Cargando…</p>}
        {itens?.filter((i) => filtro === 'todas' || i.status === filtro).map((a) => (
          <article key={a.id} className="av-item">
            <div className="av-topo">
              <div>
                <strong>{a.nome}</strong> sobre <strong>{nomePerfil.get(a.perfilId) ?? a.perfilId}</strong>
                <div className="pn-dica" style={{ margin: 0 }}>{a.email ?? 'sin correo'} · {new Date(a.criadoEm).toLocaleDateString('es-CL')}</div>
              </div>
              <span className="av-estrelas" aria-label={`${a.nota} de 5`}>{estrelas(a.nota)}</span>
            </div>
            {editando?.id === a.id ? (
              <div className="pn-campo">
                <textarea rows={3} value={editando.texto} onChange={(e) => setEditando({ id: a.id, texto: e.target.value })} />
                <div className="md-acoes">
                  <button className="btn btn-primary btn-sm" onClick={async () => { await atualizarAvaliacao(a.id, { texto: editando.texto }); setEditando(null); carregar(); }}>Guardar texto</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditando(null)}>Cancelar</button>
                </div>
              </div>
            ) : <p className="av-texto">{a.texto || <em>Sin comentario</em>}</p>}
            {a.resposta && <p className="av-texto"><strong>Respuesta pública del profesional:</strong> {a.resposta}</p>}
            {a.contestacao && <p className="av-texto"><strong>Contestación:</strong> {a.contestacao}</p>}

            <div className="md-acoes">
              {a.status !== 'aprobada' && <button className="btn btn-primary btn-sm" onClick={() => mudar(a.id, 'aprobada', 'Evaluación publicada. Aparecerá en la página en unos minutos.')}>Publicar</button>}
              {a.status !== 'en_contestacion' && a.status !== 'aprobada' && (
                <button className="btn btn-ghost btn-sm" onClick={async () => { await mudar(a.id, 'en_contestacion', 'Enviada al profesional: recibirá un aviso por correo.'); setAberta(a.id); }}>Enviar al profesional</button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => setAberta(aberta === a.id ? null : a.id)}>{aberta === a.id ? 'Cerrar conversación' : 'Conversación'}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditando({ id: a.id, texto: a.texto })}>Editar</button>
              {a.status === 'aprobada' && <button className="btn btn-ghost btn-sm" onClick={() => mudar(a.id, 'pendiente', 'Evaluación retirada de la página.')}>Retirar</button>}
              {a.status !== 'rechazada' && <button className="btn btn-ghost btn-sm" onClick={() => mudar(a.id, 'rechazada', 'Evaluación rechazada.')}>Rechazar</button>}
              <button className="pn-link pn-perigo" onClick={async () => { if (confirm('¿Eliminar esta evaluación definitivamente?')) { await apagarAvaliacao(a.id); setAviso('Evaluación eliminada.'); carregar(); } }}>Eliminar</button>
            </div>
            {aberta === a.id && <Conversa avaliacaoId={a.id} autor="admin" autorUid={moderadorUid} />}
          </article>
        ))}
      </div>
    </div>
  );
}

function NovaAvaliacao({ perfis, aoSalvar }: { perfis: Perfil[]; aoSalvar: (a: { perfilId: string; nome: string; nota: number; texto: string; status: StatusAvaliacao }) => Promise<void> }) {
  const [perfilId, setPerfilId] = useState(perfis[0]?.id ?? '');
  const [nome, setNome] = useState('');
  const [nota, setNota] = useState(5);
  const [texto, setTexto] = useState('');
  return (
    <form className="pn-servico-form" style={{ marginTop: 12 }} onSubmit={async (e) => { e.preventDefault(); await aoSalvar({ perfilId, nome: nome.trim(), nota, texto: texto.trim(), status: 'pendiente' }); }}>
      <label className="pn-campo"><span>Profesional</span>
        <select value={perfilId} onChange={(e) => setPerfilId(e.target.value)}>{perfis.map((p) => <option key={p.id} value={p.id}>{p.marca || p.nomePublico}</option>)}</select></label>
      <label className="pn-campo"><span>Nombre del cliente</span><input required value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} /></label>
      <label className="pn-campo"><span>Nota</span>
        <select value={nota} onChange={(e) => setNota(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{estrelas(n)}</option>)}</select></label>
      <label className="pn-campo"><span>Comentario</span><textarea rows={3} value={texto} maxLength={1000} onChange={(e) => setTexto(e.target.value)} /></label>
      <div className="pn-form-acoes"><button className="btn btn-primary">Agregar (queda por revisar)</button></div>
    </form>
  );
}
