import { useEffect, useMemo, useState } from 'react';
import { observarUsuario, sair, type Usuario } from '../../auth';
import { listarParaModerar, mudarStatus, novoIdAssistido, souModerador, type Privado } from '../../dados/painel';
import { textoPreco, textoPublico } from '../../dominio/formato';
import type { Perfil, Servico } from '../../dominio/tipos';
import { Editor, Entrar, type PropsPainel } from './Painel';

type Item = { perfil: Perfil; servicos: Servico[]; privado: Privado | null };
type Filtro = Perfil['status'] | 'todos';

const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'pendiente', nome: 'Por revisar' }, { id: 'aprobado', nome: 'Publicados' },
  { id: 'borrador', nome: 'Borradores' }, { id: 'pausado', nome: 'Pausados' }, { id: 'todos', nome: 'Todos' },
];

export default function Admin(props: PropsPainel) {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  const [mod, setMod] = useState<boolean | null>(null);
  const [itens, setItens] = useState<Item[] | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('pendiente');
  const [aberto, setAberto] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  const [editando, setEditando] = useState<string | null>(null);

  useEffect(() => observarUsuario(setUsuario), []);
  useEffect(() => {
    if (!usuario) return;
    souModerador().then((ok) => {
      setMod(ok);
      if (ok) carregar();
    });
  }, [usuario?.uid]);

  async function carregar() {
    const l = await listarParaModerar();
    l.sort((a, b) => (b.perfil.atualizadoEm ?? '').localeCompare(a.perfil.atualizadoEm ?? ''));
    setItens(l);
  }

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todos: itens?.length ?? 0 };
    itens?.forEach((i) => { c[i.perfil.status] = (c[i.perfil.status] ?? 0) + 1; });
    return c;
  }, [itens]);
  const visiveis = (itens ?? []).filter((i) => filtro === 'todos' || i.perfil.status === filtro);

  async function mudar(item: Item, status: Perfil['status']) {
    await mudarStatus(item.perfil.id, status, usuario!.uid);
    setAviso(status === 'aprobado'
      ? `${item.perfil.marca || item.perfil.nomePublico} aprobado. Aparecerá en lohagoyo.cl/${item.perfil.slug} en la próxima publicación.`
      : `Estado actualizado: ${status}.`);
    await carregar();
  }

  if (usuario === undefined) return <p className="pn-carregando">Cargando…</p>;
  if (!usuario) return <Entrar />;
  if (mod === null) return <p className="pn-carregando">Verificando acceso…</p>;
  if (!mod) {
    return (
      <div className="pn-entrar">
        <h1>Sin acceso de administración<span className="pn-ponto">.</span></h1>
        <p className="pn-lead">Para habilitar esta cuenta como administradora, agrega este identificador en Firestore, documento <code>config/moderadores</code>, campo <code>uids</code> (lista):</p>
        <p><code className="md-uid">{usuario.uid}</code></p>
        <button className="btn btn-ghost" onClick={() => sair()}>Salir</button>
      </div>
    );
  }

  if (editando) {
    return (
      <Editor
        key={editando} usuario={usuario} uidAlvo={editando} admin {...props}
        aoVoltar={() => { setEditando(null); carregar(); }}
      />
    );
  }

  return (
    <div>
      <header className="pn-topo">
        <div>
          <p className="pn-sobre"><span />Administración</p>
          <h1>Profesionales<span className="pn-ponto">.</span></h1>
        </div>
        <div className="pn-topo-acoes">
          <button className="btn btn-primary btn-sm" onClick={() => setEditando(novoIdAssistido())}>+ Nuevo perfil (asistido)</button>
          <button className="btn btn-ghost btn-sm" onClick={carregar}>Actualizar</button>
          <button className="btn btn-ghost btn-sm" onClick={() => sair()}>Salir</button>
        </div>
      </header>

      <div className="md-filtros" style={{ marginTop: 20 }}>
        {FILTROS.map((f) => (
          <button key={f.id} type="button" className={`pn-chip${filtro === f.id ? ' ativo' : ''}`} onClick={() => setFiltro(f.id)}>
            {f.nome} ({contagem[f.id] ?? 0})
          </button>
        ))}
      </div>
      {aviso && <p className="pn-msg pn-msg-ok" style={{ marginTop: 16 }} role="status">{aviso}</p>}

      {itens === null ? <p className="pn-carregando">Cargando…</p> : (
        <div className="md-lista">
          {visiveis.length === 0 && <p className="pn-dica">No hay perfiles en este estado.</p>}
          {visiveis.map((item) => {
            const p = item.perfil;
            const nome = p.marca || p.nomePublico;
            const email = item.privado?.email;
            const wa = p.contatos.whatsapp
              ? `https://wa.me/${p.contatos.whatsapp}?text=${encodeURIComponent(`Hola ${p.nomePublico.split(' ')[0]}, te escribo de LoHagoYo.cl por tu página.`)}`
              : null;
            return (
              <article key={p.id} className="md-item">
                <header>
                  {p.retrato ? <img src={p.retrato} alt="" /> : <span className="md-sem-foto">Sin foto</span>}
                  <div>
                    <strong>{nome}</strong>
                    <div className="pn-dica" style={{ margin: 0 }}>{p.nomePublico} · {p.oficio} · {p.comunas.join(', ')}</div>
                    <div className={`pn-status pn-status-${p.status}`}>{FILTROS.find((f) => f.id === p.status)?.nome ?? p.status}</div>
                  </div>
                </header>

                <div className="md-acoes">
                  {wa && <a className="btn btn-ghost btn-sm" href={wa} target="_blank" rel="noopener">WhatsApp</a>}
                  {email && <a className="btn btn-ghost btn-sm" href={`mailto:${email}`}>Correo</a>}
                  {p.contatos.telefone && <a className="btn btn-ghost btn-sm" href={`tel:${p.contatos.telefone.replace(/\s/g, '')}`}>Llamar</a>}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditando(p.id)}>Editar</button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(aberto === p.id ? null : p.id)}>
                    {aberto === p.id ? 'Ocultar' : 'Ver detalles'}
                  </button>
                  {p.status === 'aprobado' && <a className="btn btn-ghost btn-sm" href={`/${p.slug}/`} target="_blank" rel="noopener">Ver página</a>}
                </div>

                {aberto === p.id && (
                  <div className="md-detalhes">
                    <p><strong>Dirección:</strong> lohagoyo.cl/{p.slug}</p>
                    {p.lema && <p><strong>Frase:</strong> {p.lema}</p>}
                    <p>{p.apresentacao}</p>
                    <p><strong>Atiende:</strong> {p.publicos.map(textoPublico).join(', ')} · <strong>Boleta:</strong> {p.emiteBoleta ? 'Sí' : 'No'}</p>
                    <p><strong>Privado:</strong> {item.privado?.nomeCompleto ?? '—'} · {email ?? '—'}</p>
                    <ul>{item.servicos.map((s) => <li key={s.id}>{s.nome} — {textoPreco(s.preco)}</li>)}</ul>
                    <div className="md-fotos">
                      {[p.capa, ...p.fotos].filter(Boolean).map((f) => <img key={f} src={f} alt="" />)}
                    </div>
                  </div>
                )}

                <div className="md-acoes">
                  {p.status !== 'aprobado' && (
                    <button type="button" className="btn btn-primary" disabled={!p.retrato} onClick={() => mudar(item, 'aprobado')}>
                      Aprobar y publicar
                    </button>
                  )}
                  {p.status === 'aprobado' && <button type="button" className="btn btn-ghost" onClick={() => mudar(item, 'pausado')}>Pausar</button>}
                  {p.status === 'pausado' && <button type="button" className="btn btn-ghost" onClick={() => mudar(item, 'aprobado')}>Reactivar</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
