// Contrato da camada de dados. A interface só conhece estas funções.
import type { Avaliacao, Categoria, Perfil, Regiao, Servico } from '../dominio/tipos';

export interface FonteDados {
  listarCategorias(): Promise<Categoria[]>;
  listarRegioes(): Promise<Regiao[]>;
  /** Só perfis com status 'aprobado'. */
  listarPerfisPublicos(): Promise<Perfil[]>;
  buscarPerfilPorSlug(slug: string): Promise<Perfil | null>;
  /** Só serviços ativos, ordenados. */
  listarServicosDoPerfil(perfilId: string): Promise<Servico[]>;
  /** Só avaliações aprovadas pela moderação. */
  listarAvaliacoesDoPerfil(perfilId: string): Promise<Avaliacao[]>;
  /** Páginas fora do ar por auditoria: no endereço fica só um aviso neutro. */
  listarSuspensos(): Promise<{ slug: string; marca: string }[]>;
}
