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

export type StatusPerfil = 'borrador' | 'pendiente' | 'aprobado' | 'pausado';

/** Dados públicos. Nada aqui pode expor situação de necessidade. */
export interface Perfil {
  id: Id;
  slug: string; // 'manu-piscinas'
  nomePublico: string; // 'Manuel Araneda'
  marca?: string; // nome do negócio no topo do site: 'Manu Piscinas' (padrão: nomePublico)
  oficio: string; // 'Mantención de piscinas'
  lema?: string; // frase curta da portada
  apresentacao: string;
  categoriaIds: Id[];
  regiaoId: Id; // 'santiago'
  comunas: string[];
  publicos: Publico[];
  contatos: Contatos;
  capa?: string; // foto escolhida para a portada (padrão: fotos[0])
  retrato?: string; // foto da pessoa (seção "Sobre mí")
  fotos: string[]; // trabalhos — URLs (copiadas ao Hosting no build)
  layout: Layout;
  cor?: string; // cor de destaque opcional
  pagamentos: string[]; // 'Transferencia', 'Efectivo'
  emiteBoleta: boolean;
  horario?: string;
  tipoPessoa: 'persona_natural' | 'empresa';
  status: StatusPerfil;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Regiao {
  id: Id;
  nome: string;
  comunas: string[];
}
