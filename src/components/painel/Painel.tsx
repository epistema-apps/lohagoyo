import { useEffect, useMemo, useState } from 'react';
import { criarConta, emulador, entrarComGoogle, entrarComSenha, mensagemErro, observarUsuario, recuperarSenha, sair, type Usuario } from '../../auth';
import {
  apagarServico, carregarMeusDados, enviarParaRevisao, marcarParaRevisao, minhasAvaliacoes, responderAvaliacao,
  salvarPerfil, salvarPrivado, salvarServico, slugDisponivel, subirFoto, type NomeFoto, type Privado,
} from '../../dados/painel';
import Conversa from './Conversa';
import GeradorCartao from '../cartao/GeradorCartao';
import { textoPreco } from '../../dominio/formato';
import { gerarSlug, slugValido } from '../../dominio/slug';
import { formatarRut, normalizarRut, rutValido } from '../../dominio/rut';
import type { Avaliacao, Perfil, Publico, Servico, TipoPreco } from '../../dominio/tipos';

export type { Props as PropsPainel };
export interface FotoBanco { id: string; src: string; thumb: string; alt: string; categoria: string }
interface Props { categorias: { id: string; nome: string; sugeridos: string[] }[]; comunas: string[]; banco: FotoBanco[] }

const VERSAO_TERMOS = '2026-11-12b';
const TEXTO_ASISTIDO =
  'Registro asistido: confirmo que el profesional leyó y aceptó los Términos y Condiciones y la Política de Privacidad de LoHagoYo.cl, incluida su responsabilidad total por su página y sus servicios, y autorizó a publicar estos datos y fotos.';
const TEXTO_CONSENTIMIENTO =
  'Acepto los Términos y Condiciones y la Política de Privacidad de LoHagoYo.cl. Declaro que mis datos y mi RUT son verdaderos y que soy el titular y único responsable de mi página, de los datos personales que en ella se tratan, de toda la información y fotos que publico y de los servicios que presto, y que tengo la gestión total de ellos. LoHagoYo.cl no participa en mis trabajos ni responde por ningún daño derivado de ellos: respondo yo por cualquier daño que cause a clientes o terceros y mantendré indemne a LoHagoYo.cl frente a cualquier reclamo. Autorizo a publicar los datos y fotos que ingresé (nombre, dirección, servicios, comunas, contacto y fotos) y puedo modificarlos o pedir su eliminación en cualquier momento.';

export default function Painel(props: Props) {
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(undefined);
  useEffect(() => observarUsuario(setUsuario), []);

  if (usuario === undefined) return <p className="pn-carregando">Cargando…</p>;
  if (!usuario) return <Entrar />;
  return <Editor usuario={usuario} {...props} />;
}

// ---------------- Entrar ----------------

export function Entrar() {
  const [modo, setModo] = useState<'entrar' | 'criar' | 'recuperar'>('criar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(''); setAviso(''); setOcupado(true);
    try {
      if (modo === 'criar') {
        try { sessionStorage.setItem('lhy-nome', nome.trim()); } catch { /* */ }
        await criarConta(nome.trim(), email.trim(), senha);
      }
      else if (modo === 'entrar') await entrarComSenha(email.trim(), senha);
      else { await recuperarSenha(email.trim()); setAviso('Te enviamos un correo para crear una nueva contraseña.'); }
    } catch (x) {
      setErro(mensagemErro(x));
    } finally {
      setOcupado(false);
    }
  }
  async function google() {
    setErro('');
    try { await entrarComGoogle(); } catch (x) { setErro(mensagemErro(x)); }
  }

  return (
    <div className="pn-entrar">
      <p className="pn-sobre"><span />Tu panel</p>
      <h1>{modo === 'criar' ? 'Crea tu página gratis' : modo === 'entrar' ? 'Entra a tu panel' : 'Recupera tu contraseña'}<span className="pn-ponto">.</span></h1>
      <p className="pn-lead">
        {modo === 'criar' ? 'Usa cualquier correo (no necesita ser Gmail). Ahí te avisaremos cuando tu página esté publicada.'
          : modo === 'entrar' ? 'Con el correo y la contraseña que creaste.' : 'Escribe tu correo y te enviamos un enlace.'}
      </p>
      <div className="pn-abas" role="tablist">
        <button type="button" role="tab" aria-selected={modo === 'criar'} className={modo === 'criar' ? 'ativo' : ''} onClick={() => setModo('criar')}>Crear cuenta</button>
        <button type="button" role="tab" aria-selected={modo === 'entrar'} className={modo === 'entrar' ? 'ativo' : ''} onClick={() => setModo('entrar')}>Ya tengo cuenta</button>
      </div>
      <form onSubmit={enviar} className="pn-form-email">
        {modo === 'criar' && (
          <label className="pn-campo"><span>Tu nombre</span>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" /></label>
        )}
        <label className="pn-campo"><span>Correo</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@correo.cl" autoComplete="email" /></label>
        {modo !== 'recuperar' && (
          <label className="pn-campo"><span>Contraseña</span>
            <input type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
              autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} />
            {modo === 'criar' && <small>Mínimo 6 caracteres.</small>}</label>
        )}
        <button className="btn btn-primary pn-largo" disabled={ocupado}>
          {ocupado ? 'Un momento…' : modo === 'criar' ? 'Crear mi cuenta' : modo === 'entrar' ? 'Entrar' : 'Enviar enlace'}
        </button>
      </form>
      {modo === 'entrar' && <button type="button" className="pn-link pn-esqueci" onClick={() => setModo('recuperar')}>¿Olvidaste tu contraseña?</button>}
      {modo === 'recuperar' && <button type="button" className="pn-link pn-esqueci" onClick={() => setModo('entrar')}>Volver</button>}
      {aviso && <div className="pn-aviso">{aviso}</div>}
      {erro && <p className="pn-erro" role="alert">{erro}</p>}
      <div className="pn-ou"><span>o</span></div>
      <button className="btn btn-ghost pn-largo" onClick={google}>Continuar con Google</button>
      {emulador() && <p className="pn-dica">Modo emulador (pruebas locales).</p>}
    </div>
  );
}

// ---------------- Editor ----------------

function lerNomeCadastro(): string {
  try { return sessionStorage.getItem('lhy-nome') ?? ''; } catch { return ''; }
}

function perfilVazio(u: Usuario): Perfil {
  const t = new Date().toISOString();
  return {
    id: u.uid, slug: '', nomePublico: u.nome ?? lerNomeCadastro(), marca: '', oficio: '', lema: '', apresentacao: '',
    categoriaIds: [], regiaoId: 'santiago', comunas: [], publicos: ['casas'], contatos: {}, capa: '', retrato: '',
    fotos: [], layout: 'foto', pagamentos: [], emiteBoleta: false, horario: '', tipoPessoa: 'persona_natural',
    status: 'borrador', criadoEm: t, atualizadoEm: t,
  };
}

/** Aceita "+56 9 1234 5678", "912345678" etc. e devolve "56912345678". */
function normalizarWhatsApp(v: string): string {
  const d = v.replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) return '56' + d;
  return d;
}

const PUBLICOS: { id: Publico; nome: string }[] = [
  { id: 'casas', nome: 'Casas' }, { id: 'edificios', nome: 'Edificios y condominios' }, { id: 'empresas', nome: 'Empresas' },
];
const PAGOS = ['Transferencia', 'Efectivo', 'Tarjeta'];
const STATUS: Record<Perfil['status'], string> = {
  borrador: 'Borrador: todavía no enviada', pendiente: 'En revisión: LoHagoYo.cl revisará tu página (o tus cambios) antes de publicarla',
  aprobado: 'Publicada', pausado: 'Pausada: no aparece en LoHagoYo.cl',
  bloqueado: 'Bloqueada por evaluaciones de clientes: escribe a hola@lohagoyo.cl',
};

export function Editor({ usuario, categorias, comunas, banco, uidAlvo, admin = false, aoVoltar }: Props & {
  usuario: Usuario; uidAlvo?: string; admin?: boolean; aoVoltar?: () => void;
}) {
  const alvo = uidAlvo ?? usuario.uid;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [slugOriginal, setSlugOriginal] = useState('');
  const [privado, setPrivado] = useState<Privado>(admin ? { nomeCompleto: '', email: '' } : { nomeCompleto: usuario.nome ?? lerNomeCadastro(), email: usuario.email ?? '' });
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; t: string } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [slugLivre, setSlugLivre] = useState<boolean | null>(null);
  const [aceito, setAceito] = useState(false);
  const [editando, setEditando] = useState<Servico | 'novo' | null>(null);

  useEffect(() => {
    carregarMeusDados(alvo)
      .then((d) => {
        setPerfil(d.perfil ?? perfilVazio(admin ? { uid: alvo, email: null, nome: null } : usuario));
        setSlugOriginal(d.perfil?.slug ?? '');
        if (d.privado) setPrivado(d.privado);
        setServicos(d.servicos);
      })
      .catch(() => setMsg({ tipo: 'erro', t: 'No pudimos cargar tus datos. Recarga la página.' }));
  }, [alvo]);

  // disponibilidade do endereço
  useEffect(() => {
    if (!perfil?.slug || !slugValido(perfil.slug)) { setSlugLivre(null); return; }
    const t = setTimeout(() => slugDisponivel(perfil.slug, alvo).then(setSlugLivre).catch(() => setSlugLivre(null)), 400);
    return () => clearTimeout(t);
  }, [perfil?.slug, alvo]);

  const pendencias = useMemo(() => {
    if (!perfil) return [];
    const f: string[] = [];
    if (!perfil.retrato) f.push('Sube una foto tuya (obligatoria)');
    if (!perfil.marca && !perfil.nomePublico) f.push('Escribe tu nombre o el nombre de tu servicio');
    if (!slugValido(perfil.slug) || slugLivre === false) f.push('Elige una dirección válida y libre');
    if (!perfil.oficio) f.push('Escribe a qué te dedicas');
    if (!perfil.categoriaIds.length) f.push('Elige al menos una categoría');
    if (!perfil.comunas.length) f.push('Elige dónde atiendes');
    if (!perfil.endereco?.calle?.trim() || !perfil.endereco?.numero?.trim() || !perfil.endereco?.comuna?.trim()) f.push('Escribe tu dirección completa (calle, número y comuna)');
    if (!perfil.contatos.whatsapp && !perfil.contatos.telefone) f.push('Agrega tu WhatsApp o teléfono');
    if (!servicos.length) f.push('Agrega al menos un servicio');
    if (!privado.nomeCompleto?.trim()) f.push('Escribe tu nombre completo');
    if (!rutValido(privado.rut ?? '')) f.push('Escribe un RUT válido (privado)');
    return f;
  }, [perfil, servicos, slugLivre, privado]);

  if (!perfil) return <p className="pn-carregando">{msg?.t ?? 'Cargando tu página…'}</p>;

  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setPerfil((p) => (p ? { ...p, [k]: v } : p));
  const alternar = <T,>(lista: T[], v: T) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);
  const categoriaPrincipal = perfil.categoriaIds[0];

  async function guardar(status?: Perfil['status']): Promise<boolean> {
    if (!perfil) return false;
    setSalvando(true);
    setMsg(null);
    try {
      const slug = perfil.slug || gerarSlug(perfil.marca || perfil.nomePublico);
      if (!slugValido(slug)) throw new Error('slug');
      const st = status ?? (!admin && perfil.status === 'aprobado' ? 'pendiente' : perfil.status);
      const novo = { ...perfil, id: alvo, slug, status: st,
        ...(admin && st === 'aprobado' && !perfil.aprovadoPor ? { aprovadoPor: usuario.uid, aprovadoEm: new Date().toISOString() } : {}) };
      await salvarPerfil(novo, slugOriginal || undefined);
      await salvarPrivado(alvo, { ...privado, rut: privado.rut && rutValido(privado.rut) ? normalizarRut(privado.rut) : undefined });
      setPerfil(novo);
      setSlugOriginal(slug);
      setMsg({ tipo: 'ok', t: !admin && perfil.status === 'aprobado' ? 'Cambios guardados. Quedan en revisión; tu página sigue publicada como estaba.' : 'Cambios guardados.' });
      return true;
    } catch (e) {
      const m = e instanceof Error && e.message === 'slug-ocupado' ? 'Esa dirección ya está en uso. Elige otra.'
        : e instanceof Error && e.message === 'slug' ? 'La dirección debe tener solo letras, números y guiones.'
        : 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.';
      setMsg({ tipo: 'erro', t: m });
      return false;
    } finally {
      setSalvando(false);
    }
  }

  async function enviar() {
    if (pendencias.length || !aceito) return;
    if (!(await guardar(admin ? 'aprobado' : 'pendiente'))) return;
    try {
      await enviarParaRevisao(alvo, VERSAO_TERMOS, admin ? TEXTO_ASISTIDO : TEXTO_CONSENTIMIENTO, admin ? usuario.uid : undefined);
      if (admin) { setMsg({ tipo: 'ok', t: 'Perfil aprobado. Aparecerá en la próxima publicación.' }); return; }
      setMsg({ tipo: 'ok', t: '¡Listo! LoHagoYo.cl revisará tu página y la publicará cuando esté aprobada.' });
    } catch {
      setMsg({ tipo: 'erro', t: 'No se pudo enviar. Inténtalo de nuevo.' });
    }
  }

  async function foto(nome: NomeFoto, arquivo: File): Promise<string | null> {
    try {
      return await subirFoto(alvo, nome, arquivo);
    } catch (e) {
      const c = (e as { code?: string })?.code ?? '';
      setMsg({ tipo: 'erro', t: c.includes('unauthorized') || c.includes('permission')
        ? 'Sin permiso para subir la foto. Sal y vuelve a entrar e inténtalo de nuevo.'
        : 'No se pudo subir la foto. Prueba con otra imagen (JPG o PNG).' });
      console.error(e);
      return null;
    }
  }

  return (
    <div className="pn-editor">
      <header className="pn-topo">
        <div>
          <p className="pn-sobre"><span />{admin ? 'Administración · editando perfil' : 'Tu página'}</p>
          <h1>{perfil.marca || perfil.nomePublico || 'Tu página'}<span className="pn-ponto">.</span></h1>
          <p className={`pn-status pn-status-${perfil.status}`}>{STATUS[perfil.status]}</p>
        </div>
        <div className="pn-topo-acoes">
          {admin && aoVoltar && <button className="btn btn-ghost btn-sm" onClick={aoVoltar}>← Volver a la lista</button>}
          {perfil.status === 'aprobado' && <a className="btn btn-ghost btn-sm" href={`/${perfil.slug}/`} target="_blank" rel="noopener">{admin ? 'Ver página' : 'Ver mi página'}</a>}
          {!admin && <button className="btn btn-ghost btn-sm" onClick={() => sair()}>Salir</button>}
        </div>
      </header>

      {/* 1. Foto */}
      <Secao n="01" titulo={admin ? 'Foto del profesional' : 'Tu foto'} ajuda="Obligatoria. Que se vea bien la cara: los clientes confían más cuando saben quién va a su casa.">
        <FotoCampo
          rotulo="Foto tuya" valor={perfil.retrato} redonda obrigatoria
          aoSubir={async (f) => { const u = await foto('retrato', f); if (u) set('retrato', u); }}
          aoRemover={() => set('retrato', '')}
        />
      </Secao>

      {/* 2. Quem é */}
      <Secao n="02" titulo="Quién eres y qué haces">
        <Campo rotulo="Tu nombre" ajuda="Como quieres que te conozcan. Ej: Pedro Soto">
          <input value={perfil.nomePublico} maxLength={80} onChange={(e) => set('nomePublico', e.target.value)} />
        </Campo>
        <Campo rotulo="Nombre de tu servicio (opcional)" ajuda="Aparece grande en tu página. Ej: Pedro Piscinas">
          <input value={perfil.marca ?? ''} maxLength={60} onChange={(e) => {
            const marca = e.target.value;
            setPerfil({ ...perfil, marca, slug: !slugOriginal && (!perfil.slug || perfil.slug === gerarSlug(perfil.marca || perfil.nomePublico)) ? gerarSlug(marca || perfil.nomePublico) : perfil.slug });
          }} />
        </Campo>
        <Campo rotulo="Dirección de tu página" ajuda={slugLivre === false ? 'Esa dirección ya está en uso.' : slugLivre ? 'Disponible.' : 'Solo letras minúsculas, números y guiones.'}>
          <div className="pn-slug">
            <span>lohagoyo.cl/</span>
            <input value={perfil.slug} maxLength={40} onChange={(e) => set('slug', gerarSlug(e.target.value).slice(0, 40) || e.target.value.toLowerCase())} />
          </div>
        </Campo>
        <Campo rotulo="¿A qué te dedicas?" ajuda="Ej: Servicio integral para piscinas">
          <input value={perfil.oficio} maxLength={80} onChange={(e) => set('oficio', e.target.value)} />
        </Campo>
        <Campo rotulo="Categorías (hasta 3)">
          <div className="pn-chips">
            {categorias.map((c) => (
              <button type="button" key={c.id} className={`pn-chip${perfil.categoriaIds.includes(c.id) ? ' ativo' : ''}`}
                onClick={() => { const l = alternar(perfil.categoriaIds, c.id); if (l.length <= 3) set('categoriaIds', l); }}>
                {c.nome}
              </button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Frase corta (opcional)" ajuda="Ej: Tu piscina limpia y lista, toda la temporada.">
          <input value={perfil.lema ?? ''} maxLength={90} onChange={(e) => set('lema', e.target.value)} />
        </Campo>
        <Campo rotulo="Preséntate" ajuda="Cuenta cómo trabajas, tu experiencia y qué te diferencia.">
          <textarea rows={4} value={perfil.apresentacao} maxLength={1500} onChange={(e) => set('apresentacao', e.target.value)} />
        </Campo>
      </Secao>

      {/* 3. Onde e para quem */}
      <Secao n="03" titulo="Dirección, dónde y para quién" ajuda="La dirección es obligatoria y aparece en tu página: da confianza a los clientes y nos ayuda a evitar fraudes.">
        <Campo rotulo="Comunas donde atiendes">
          <div className="pn-chips">
            {['Todo Santiago', ...comunas].map((c) => (
              <button type="button" key={c} className={`pn-chip${perfil.comunas.includes(c) ? ' ativo' : ''}`}
                onClick={() => set('comunas', c === 'Todo Santiago' ? (perfil.comunas.includes(c) ? [] : [c]) : alternar(perfil.comunas.filter((x) => x !== 'Todo Santiago'), c))}>
                {c}
              </button>
            ))}
          </div>
        </Campo>
        <Campo rotulo="Atiendes a">
          <div className="pn-chips">
            {PUBLICOS.map((p) => (
              <button type="button" key={p.id} className={`pn-chip${perfil.publicos.includes(p.id) ? ' ativo' : ''}`}
                onClick={() => { const l = alternar(perfil.publicos, p.id); if (l.length) set('publicos', l); }}>{p.nome}</button>
            ))}
          </div>
        </Campo>
        <div className="pn-linha">
          <Campo rotulo="Calle" ajuda="Tu dirección aparece en tu página.">
            <input value={perfil.endereco?.calle ?? ''} maxLength={120} autoComplete="address-line1"
              onChange={(e) => set('endereco', { calle: '', numero: '', comuna: '', ...perfil.endereco, calle: e.target.value })} />
          </Campo>
          <Campo rotulo="Número">
            <input value={perfil.endereco?.numero ?? ''} maxLength={20} inputMode="numeric"
              onChange={(e) => set('endereco', { calle: '', numero: '', comuna: '', ...perfil.endereco, numero: e.target.value })} />
          </Campo>
        </div>
        <div className="pn-linha">
          <Campo rotulo="Comuna">
            <input value={perfil.endereco?.comuna ?? ''} maxLength={60} list="pn-comunas"
              onChange={(e) => set('endereco', { calle: '', numero: '', comuna: '', ...perfil.endereco, comuna: e.target.value })} />
            <datalist id="pn-comunas">{comunas.map((c) => <option key={c} value={c} />)}</datalist>
          </Campo>
          <Campo rotulo="Depto / referencia (opcional)">
            <input value={perfil.endereco?.referencia ?? ''} maxLength={60}
              onChange={(e) => set('endereco', { calle: '', numero: '', comuna: '', ...perfil.endereco, referencia: e.target.value || undefined })} />
          </Campo>
        </div>
        <Campo rotulo="Horario (opcional)" ajuda="Ej: Lunes a sábado, 8:00 a 18:00">
          <input value={perfil.horario ?? ''} maxLength={80} onChange={(e) => set('horario', e.target.value)} />
        </Campo>
      </Secao>

      {/* 4. Contato */}
      <Secao n="04" titulo="Contacto" ajuda="Los clientes te escribirán directo. Lo que dejes vacío no aparece en tu página.">
        <Campo rotulo="WhatsApp" ajuda="Ej: +56 9 1234 5678">
          <input inputMode="tel" value={perfil.contatos.whatsapp ? `+${perfil.contatos.whatsapp}` : ''} onChange={(e) => set('contatos', { ...perfil.contatos, whatsapp: normalizarWhatsApp(e.target.value) || undefined })} />
        </Campo>
        <Campo rotulo="Teléfono para llamadas (opcional)">
          <input inputMode="tel" value={perfil.contatos.telefone ?? ''} onChange={(e) => set('contatos', { ...perfil.contatos, telefone: e.target.value || undefined })} />
        </Campo>
        <Campo rotulo="Correo público (opcional)">
          <input type="email" value={perfil.contatos.email ?? ''} onChange={(e) => set('contatos', { ...perfil.contatos, email: e.target.value || undefined })} />
        </Campo>
        <Campo rotulo="Formas de pago">
          <div className="pn-chips">
            {PAGOS.map((p) => (
              <button type="button" key={p} className={`pn-chip${perfil.pagamentos.includes(p) ? ' ativo' : ''}`} onClick={() => set('pagamentos', alternar(perfil.pagamentos, p))}>{p}</button>
            ))}
          </div>
        </Campo>
        <label className="pn-check">
          <input type="checkbox" checked={perfil.emiteBoleta} onChange={(e) => set('emiteBoleta', e.target.checked)} />
          Emito boleta
        </label>
        <Campo rotulo="Tu nombre completo (privado)" ajuda="Solo lo ve el equipo de LoHagoYo.cl. No aparece en tu página.">
          <input value={privado.nomeCompleto} maxLength={120} onChange={(e) => setPrivado({ ...privado, nomeCompleto: e.target.value })} />
        </Campo>
        <Campo rotulo="Tu RUT (privado)" ajuda="Obligatorio. Nunca aparece en tu página. Te identifica como responsable de tu página, tus servicios y los datos que publicas.">
          <input value={privado.rut ?? ''} inputMode="text" autoComplete="off" placeholder="12.345.678-9" maxLength={12}
            onChange={(e) => setPrivado({ ...privado, rut: e.target.value })}
            onBlur={() => privado.rut && setPrivado({ ...privado, rut: formatarRut(privado.rut) })} />
          {privado.rut && !rutValido(privado.rut) && <small className="pn-erro">RUT no válido: revisa el dígito verificador.</small>}
        </Campo>
      </Secao>

      {/* 5. Serviços */}
      <Secao n="05" titulo="Tus servicios" ajuda="Agrega cada servicio con su descripción. El precio es opcional.">
        <ul className="pn-servicos">
          {servicos.map((s) => (
            <li key={s.id}>
              <div><strong>{s.nome}</strong><span>{textoPreco(s.preco)}</span></div>
              <button type="button" className="pn-link" onClick={() => setEditando(s)}>Editar</button>
            </li>
          ))}
        </ul>
        {editando ? (
          <ServicoForm
            inicial={editando === 'novo' ? null : editando}
            sugeridos={categorias.filter((c) => perfil.categoriaIds.includes(c.id)).flatMap((c) => c.sugeridos)}
            aoCancelar={() => setEditando(null)}
            aoApagar={editando !== 'novo' ? async () => {
              await apagarServico(editando.id);
              setServicos(servicos.filter((x) => x.id !== editando.id));
              setEditando(null);
            } : undefined}
            aoSalvar={async (dados) => {
              try {
                const base = editando === 'novo' ? null : editando;
                const s = {
                  ...dados, perfilId: alvo, categoriaId: categoriaPrincipal ?? 'piscinas', ativo: true,
                  ordem: base?.ordem ?? servicos.length + 1, criadoEm: base?.criadoEm ?? new Date().toISOString(),
                  atualizadoEm: new Date().toISOString(),
                };
                const id = await salvarServico(base ? { ...s, id: base.id } : s);
                setServicos(base ? servicos.map((x) => (x.id === id ? { ...s, id } : x)) : [...servicos, { ...s, id }]);
                setEditando(null);
                if (!admin && perfil.status === 'aprobado') { await marcarParaRevisao(alvo); set('status', 'pendiente'); }
              } catch {
                setMsg({ tipo: 'erro', t: 'No se pudo guardar el servicio. Primero guarda tu página (botón Guardar).' });
              }
            }}
          />
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setEditando('novo')}>+ Agregar servicio</button>
        )}
      </Secao>

      {/* 6. Fotos da página */}
      <Secao n="06" titulo="Fotos de tu página" ajuda="Sube tus fotos o elige del banco de LoHagoYo.cl. La portada es la foto grande del inicio.">
        <FotoCampo
          rotulo="Portada" valor={perfil.capa ?? ''} banco={banco} categoria={categoriaPrincipal}
          aoSubir={async (f) => { const u = await foto('capa', f); if (u) set('capa', u); }}
          aoEscolher={(src) => set('capa', src)} aoRemover={() => set('capa', '')}
        />
        <div className="pn-trabalhos">
          {[0, 1, 2, 3].map((i) => (
            <FotoCampo
              key={i} rotulo={`Trabajo ${i + 1}`} valor={perfil.fotos[i] ?? ''} banco={banco} categoria={categoriaPrincipal} pequena
              aoSubir={async (f) => { const u = await foto(`trabajo-${i + 1}` as NomeFoto, f); if (u) { const l = [...perfil.fotos]; l[i] = u; set('fotos', l.filter(Boolean)); } }}
              aoEscolher={(src) => { const l = [...perfil.fotos]; l[i] = src; set('fotos', l.filter(Boolean)); }}
              aoRemover={() => set('fotos', perfil.fotos.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      </Secao>

 {!admin && perfil.status !== 'borrador' && <Opinioes uid={alvo} />}

 {/* 7. Tarjeta */}
      <Secao n="07" titulo="Tu tarjeta de presentación" ajuda="Elige el diseño. Aparece al final de tu página para que la descarguen o compartan, y puedes imprimirla.">
        <GeradorCartao
          inicial={perfil.cartao}
          aoEscolher={(c) => { if (c.estrutura !== perfil.cartao?.estrutura || c.tema !== perfil.cartao?.tema) setPerfil((p) => (p ? { ...p, cartao: c } : p)); }}
          dados={{
            marca: perfil.marca || perfil.nomePublico || 'Tu nombre',
            nome: perfil.nomePublico,
            oficio: perfil.oficio || 'Tu oficio',
            telefone: perfil.contatos.telefone ?? (perfil.contatos.whatsapp ? `+${perfil.contatos.whatsapp}` : ''),
            email: perfil.contatos.email ?? '',
            comunas: perfil.comunas.includes('Todo Santiago') ? 'Todo Santiago' : perfil.comunas.slice(0, 3).join(' · '),
            url: `https://lohagoyo.cl/${perfil.slug || 'tu-pagina'}/`,
            urlCurta: `lohagoyo.cl/${perfil.slug || 'tu-pagina'}`,
          }}
        />
      </Secao>

      {/* 8. Enviar */}
      <Secao n="08" titulo={admin ? 'Guardar y publicar' : 'Enviar a revisión'}>
        {pendencias.length > 0 && (
          <ul className="pn-pendencias">{pendencias.map((p) => <li key={p}>{p}</li>)}</ul>
        )}
        <label className="pn-check">
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} />
          {admin ? TEXTO_ASISTIDO : TEXTO_CONSENTIMIENTO}
        </label>
        <p className="pn-dica">Lee los <a href="/terminos/" target="_blank" rel="noopener">Términos y Condiciones</a> y la <a href="/privacidad/" target="_blank" rel="noopener">Política de Privacidad</a>.</p>
        <button className="btn btn-primary pn-largo" disabled={salvando || pendencias.length > 0 || !aceito} onClick={enviar}>
          {admin ? 'Guardar y publicar' : 'Enviar a revisión'}
        </button>
      </Secao>

      <div className="pn-barra">
        {msg && <p className={`pn-msg pn-msg-${msg.tipo}`} role="status">{msg.t}</p>}
        <button className="btn btn-primary" disabled={salvando} onClick={() => guardar()}>{salvando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
}

// ---------------- peças ----------------

function Secao({ n, titulo, ajuda, children }: { n: string; titulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <section className="pn-secao">
      <header><span className="pn-num">{n}</span><h2>{titulo}</h2></header>
      {ajuda && <p className="pn-ajuda-secao">{ajuda}</p>}
      <div className="pn-secao-corpo">{children}</div>
    </section>
  );
}

function Campo({ rotulo, ajuda, children }: { rotulo: string; ajuda?: string; children: React.ReactNode }) {
  return (
    <label className="pn-campo">
      <span>{rotulo}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}

function FotoCampo(p: {
  rotulo: string; valor: string; redonda?: boolean; pequena?: boolean; obrigatoria?: boolean;
  banco?: FotoBanco[]; categoria?: string;
  aoSubir: (f: File) => Promise<void>; aoEscolher?: (src: string) => void; aoRemover: () => void;
}) {
  const [subindo, setSubindo] = useState(false);
  const [abrirBanco, setAbrirBanco] = useState(false);
  const ordenado = useMemo(() => (p.banco ?? []).slice().sort((a, b) => Number(b.categoria === p.categoria) - Number(a.categoria === p.categoria)), [p.banco, p.categoria]);
  return (
    <div className={`pn-foto${p.redonda ? ' redonda' : ''}${p.pequena ? ' pequena' : ''}`}>
      <div className="pn-foto-previa">
        {p.valor ? <img src={p.valor} alt="" /> : <span>{p.obrigatoria ? 'Obligatoria' : 'Sin foto'}</span>}
      </div>
      <div className="pn-foto-acoes">
        <strong>{p.rotulo}</strong>
        <label className="btn btn-ghost btn-sm">
          {subindo ? 'Subiendo…' : p.valor ? 'Cambiar' : 'Subir foto'}
          <input type="file" accept="image/*" hidden disabled={subindo}
            onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; setSubindo(true); await p.aoSubir(f); setSubindo(false); e.target.value = ''; }} />
        </label>
        {p.aoEscolher && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAbrirBanco(true)}>Elegir del banco</button>}
        {p.valor && <button type="button" className="pn-link" onClick={p.aoRemover}>Quitar</button>}
      </div>
      {abrirBanco && p.aoEscolher && (
        <div className="pn-modal" role="dialog" aria-modal="true" aria-label="Banco de fotos" onClick={() => setAbrirBanco(false)}>
          <div className="pn-modal-caixa" onClick={(e) => e.stopPropagation()}>
            <header><h3>Banco de fotos</h3><button type="button" className="pn-link" onClick={() => setAbrirBanco(false)}>Cerrar</button></header>
            <div className="pn-banco">
              {ordenado.map((f) => (
                <button type="button" key={f.id} onClick={() => { p.aoEscolher!(f.src); setAbrirBanco(false); }}>
                  <img src={f.thumb} alt={f.alt} loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TIPOS: { id: TipoPreco; nome: string }[] = [
  { id: 'a_cotizar', nome: 'A cotizar (sin precio)' }, { id: 'fijo', nome: 'Precio fijo' }, { id: 'desde', nome: 'Desde' },
  { id: 'por_visita', nome: 'Por visita' }, { id: 'por_hora', nome: 'Por hora' }, { id: 'por_m2', nome: 'Por m²' }, { id: 'mensual', nome: 'Mensual' },
];

type DadosServico = Pick<Servico, 'nome' | 'descricao' | 'incluye' | 'preco' | 'temporadas' | 'extras'>;

function ServicoForm({ inicial, sugeridos, aoSalvar, aoCancelar, aoApagar }: {
  inicial: Servico | null; sugeridos: string[];
  aoSalvar: (d: DadosServico) => Promise<void>; aoCancelar: () => void; aoApagar?: () => Promise<void>;
}) {
  const [nome, setNome] = useState(inicial?.nome ?? '');
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [incluye, setIncluye] = useState((inicial?.incluye ?? []).join('\n'));
  const [tipo, setTipo] = useState<TipoPreco>(inicial?.preco.tipo ?? 'a_cotizar');
  const [valor, setValor] = useState(inicial?.preco.valor?.toString() ?? '');
  const [mostrar, setMostrar] = useState(inicial?.preco.mostrar ?? true);
  const [materiais, setMateriais] = useState(inicial?.preco.materiais ?? 'incluidos');
  const [temporadas, setTemporadas] = useState((inicial?.temporadas ?? []).map((t) => `${t.nome}: ${t.frequencia}`).join('\n'));
  const [extras, setExtras] = useState((inicial?.extras ?? []).map((e) => `${e.nome}: ${e.nota}`).join('\n'));
  const [salvando, setSalvando] = useState(false);

  const linhas = (t: string) => t.split('\n').map((l) => l.trim()).filter(Boolean);
  const pares = (t: string) => linhas(t).map((l) => { const [a, ...b] = l.split(':'); return [a.trim(), b.join(':').trim()] as const; });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const n = Number(valor.replace(/\D/g, ''));
    await aoSalvar({
      nome: nome.trim(), descricao: descricao.trim(), incluye: linhas(incluye).slice(0, 12),
      preco: { tipo, ...(tipo !== 'a_cotizar' && n ? { valor: n } : {}), mostrar, materiais },
      temporadas: pares(temporadas).map(([nome, frequencia]) => ({ nome, frequencia })),
      extras: pares(extras).map(([nome, nota]) => ({ nome, nota: nota || 'costo aparte' })),
    });
    setSalvando(false);
  }

  return (
    <form className="pn-servico-form" onSubmit={salvar}>
      <Campo rotulo="Nombre del servicio">
        <input required value={nome} maxLength={80} list="pn-sugeridos" onChange={(e) => setNome(e.target.value)} />
        <datalist id="pn-sugeridos">{sugeridos.map((s) => <option key={s} value={s} />)}</datalist>
      </Campo>
      <Campo rotulo="Descripción">
        <textarea rows={3} value={descricao} maxLength={1000} onChange={(e) => setDescricao(e.target.value)} />
      </Campo>
      <Campo rotulo="¿Qué incluye? (uno por línea)" ajuda="Ej: Aspirado de fondo">
        <textarea rows={4} value={incluye} onChange={(e) => setIncluye(e.target.value)} />
      </Campo>
      <div className="pn-linha">
        <Campo rotulo="Precio">
          <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPreco)}>
            {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </Campo>
        {tipo !== 'a_cotizar' && (
          <Campo rotulo="Valor (CLP)">
            <input inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="25000" />
          </Campo>
        )}
      </div>
      {tipo !== 'a_cotizar' && (
        <label className="pn-check"><input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} /> Mostrar el precio en mi página</label>
      )}
      <Campo rotulo="Materiales / insumos">
        <select value={materiais} onChange={(e) => setMateriais(e.target.value as typeof materiais)}>
          <option value="incluidos">Incluidos</option>
          <option value="aparte">Aparte</option>
          <option value="estimado">Según el trabajo</option>
        </select>
      </Campo>
      <Campo rotulo="Frecuencia por temporada (opcional)" ajuda="Una por línea. Ej: Temporada alta (nov-mar): 2 visitas semanales">
        <textarea rows={2} value={temporadas} onChange={(e) => setTemporadas(e.target.value)} />
      </Campo>
      <Campo rotulo="Adicionales con costo aparte (opcional)" ajuda="Uno por línea. Ej: Aguas verdes con algas: costo aparte">
        <textarea rows={2} value={extras} onChange={(e) => setExtras(e.target.value)} />
      </Campo>
      <div className="pn-form-acoes">
        <button className="btn btn-primary" disabled={salvando || !nome.trim()}>{salvando ? 'Guardando…' : 'Guardar servicio'}</button>
        <button type="button" className="btn btn-ghost" onClick={aoCancelar}>Cancelar</button>
        {aoApagar && <button type="button" className="pn-link pn-perigo" onClick={() => confirm('¿Eliminar este servicio?') && aoApagar()}>Eliminar</button>}
      </div>
    </form>
  );
}

// ---------------- opiniões (visão do profissional) ----------------

function Opinioes({ uid }: { uid: string }) {
  const [lista, setLista] = useState<Avaliacao[] | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [resposta, setResposta] = useState<Record<string, string>>({});
  const [ok, setOk] = useState('');
  useEffect(() => { minhasAvaliacoes(uid).then(setLista).catch(() => setLista([])); }, [uid]);
  if (!lista?.length) return null;
  return (
    <Secao n="★" titulo="Opiniones de tus clientes" ajuda="LoHagoYo.cl revisa cada opinión antes de publicarla. Si te enviamos una para revisar, puedes conversar con nosotros y dejar una respuesta pública.">
      <div className="av-lista">
        {lista.map((a) => (
          <article key={a.id} className="av-item">
            <div className="av-topo">
              <strong>{a.nome}</strong>
              <span className="av-estrelas">{'★'.repeat(a.nota) + '☆'.repeat(5 - a.nota)}</span>
            </div>
            <p className="av-texto">{a.texto}</p>
            <p className="pn-dica" style={{ margin: 0 }}>{a.status === 'aprobada' ? 'Publicada en tu página' : 'LoHagoYo.cl quiere conversar contigo antes de publicarla'}</p>
            {a.status === 'en_contestacion' && (
              <>
                <Campo rotulo="Respuesta pública (opcional)" ajuda="Si se publica la opinión, tu respuesta aparece debajo.">
                  <textarea rows={2} maxLength={1000} value={resposta[a.id] ?? a.resposta ?? ''} onChange={(e) => setResposta({ ...resposta, [a.id]: e.target.value })} />
                </Campo>
                <div className="pn-form-acoes">
                  <button className="btn btn-ghost btn-sm" onClick={async () => { await responderAvaliacao(a.id, resposta[a.id] ?? a.resposta ?? '', a.contestacao ?? ''); setOk('Respuesta guardada.'); }}>Guardar respuesta</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setAberta(aberta === a.id ? null : a.id)}>{aberta === a.id ? 'Cerrar conversación' : 'Conversar con LoHagoYo.cl'}</button>
                </div>
                {aberta === a.id && <Conversa avaliacaoId={a.id} autor="profissional" autorUid={uid} />}
              </>
            )}
          </article>
        ))}
      </div>
      {ok && <p className="pn-msg pn-msg-ok">{ok}</p>}
    </Secao>
  );
}
