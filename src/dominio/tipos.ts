// Tipos do domínio — independentes do banco (Firebase hoje, Supabase amanhã).

export type Id = string;

export type TipoPreco =
  | 'fijo'
  | 'desde'
  | 'por_visita'
  | 'por_hora'
  | 'por_m2'
  | 'mensual'
  | 'a_cotizar';

export type Publico = 'casas' | 'edificios' | 'empresas';

export type Layout = 'claro' | 'foto' | 'compacto';

/** Modelos da página do profissional (o id fica em Perfil.layout). */
export const MODELOS_PAGINA: { id: Layout; nome: string; descricao: string }[] = [
  { id: 'foto', nome: 'Editorial', descricao: 'Collage de fotos, datos destacados y servicios numerados.' },
  { id: 'claro', nome: 'Portada', descricao: 'Tu foto de portada a pantalla completa, con impacto. Servicios en tarjetas.' },
  { id: 'compacto', nome: 'Directa', descricao: 'Una columna con tu foto y los botones de contacto primero. Ideal para celular.' },
];
export const modeloPagina = (l: unknown): Layout => (MODELOS_PAGINA.some((m) => m.id === l) ? (l as Layout) : 'foto');

export interface Categoria {
  id: Id; // slug, ex.: 'piscinas'
  nome: string; // 'Piscinas'
  descricao: string;
  foto?: string; // id em src/dados/fotos.ts
  servicosSugeridos: string[];
}

export interface Temporada {
  nome: string; // 'Temporada alta (nov–mar)'
  frequencia: string; // '2 visitas semanales'
}

export interface Extra {
  nome: string;
  nota: string; // 'costo aparte', 'según cotización'
}

export interface Preco {
  tipo: TipoPreco;
  valor?: number; // CLP; ausente em 'a_cotizar'
  maoDeObra?: number; // CLP, opcional
  materiais?: 'incluidos' | 'aparte' | 'estimado';
  materiaisEstimado?: number; // CLP, quando 'estimado'
  mostrar: boolean; // o profissional escolhe exibir ou não
}

export interface Servico {
  id: Id;
  perfilId: Id;
  categoriaId: Id;
  nome: string;
  descricao: string;
  incluye: string[];
  preco: Preco;
  temporadas: Temporada[];
  extras: Extra[];
  ativo: boolean;
  ordem: number;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
}

export interface Contatos {
  whatsapp?: string; // E.164 sem '+', ex.: '56912345678'
  telefone?: string;
  email?: string;
  instagram?: string;
}

export type StatusPerfil = 'borrador' | 'pendiente' | 'aprobado' | 'pausado' | 'bloqueado';

/** Dados públicos. Nada aqui pode expor situação de necessidade. */
export interface Perfil {
  id: Id;
  slug: string; // 'manu-piscinas'
  nomePublico: string; // 'Pedro Soto'
  marca?: string; // nome do negócio no topo do site: 'Pedro Piscinas' (padrão: nomePublico)
  oficio: string; // 'Mantención de piscinas'
  lema?: string; // frase curta da portada
  apresentacao: string;
  categoriaIds: Id[];
  regiaoId: Id; // 'santiago'
  comunas: string[];
  publicos: Publico[];
  contatos: Contatos;
  endereco?: Endereco; // obrigatório para publicar; aparece na página
  capa?: string; // foto escolhida para a portada (padrão: fotos[0])
  retrato?: string; // foto da pessoa (seção "Sobre mí")
  fotos: string[]; // trabalhos — URLs (copiadas ao Hosting no build)
  layout: Layout;
  cartao?: { estrutura: string; tema: string }; // tarjeta escolhida no painel
  cor?: string; // cor de destaque opcional
  pagamentos: string[]; // 'Transferencia', 'Efectivo'
  emiteBoleta: boolean;
  horario?: string;
  tipoPessoa: 'persona_natural' | 'empresa';
  status: StatusPerfil;
  aprovadoPor?: string;
  aprovadoEm?: string;
  bloqueadoEm?: string;
  auditadoEm?: string; // última auditoria concluída: avaliações negativas contam a partir daqui
  motivoBloqueio?: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Regiao {
  id: Id;
  nome: string;
  comunas: string[];
}

export interface Endereco {
  calle: string;
  numero: string;
  comuna: string;
  referencia?: string; // depto, block, etc.
  codigoPostal?: string; // 7 dígitos; obrigatório para enviar à revisão (validado no painel)
}

export type StatusAvaliacao = 'por_confirmar' | 'pendiente' | 'en_contestacion' | 'aprobada' | 'rechazada';

/** Avaliação de um cliente. O e-mail de quem avalia fica em outra coleção, privada. */
export interface Avaliacao {
  id: Id;
  perfilId: Id;
  nome: string;
  nota: number; // 1..5
  texto: string;
  status: StatusAvaliacao;
  resposta?: string; // resposta pública do profissional
  contestacao?: string; // mensagem privada do profissional para a moderação
  respondidoEm?: string;
  criadoEm: string;
}

/** Endereço curto (calle número, depto, comuna) — usado na tarjeta e no link do mapa. */
export function textoEndereco(e?: Endereco): string {
  if (!e?.calle) return '';
  return [`${e.calle} ${e.numero}`.trim(), e.referencia, e.comuna].filter(Boolean).join(', ');
}

/** Endereço completo com código postal — usado na página. */
export function textoEnderecoCompleto(e?: Endereco): string {
  const curto = textoEndereco(e);
  return curto && e?.codigoPostal ? `${curto} · Código postal ${e.codigoPostal}` : curto;
}
