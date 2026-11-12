// Adaptador com dados fictícios em memória (desenvolvimento).
// Perfis REAIS para teste local podem ficar em data/perfis-locais.json (fora do git).
import type { Avaliacao, Perfil, Servico } from '../dominio/tipos';
import type { FonteDados } from './contrato';
import * as semilla from './semilla';

// data/perfis-locais.json: perfis cadastrados à mão. data/publicado.json: aprovados no painel
// (gerado por scripts/sincronizar.mjs). Os dois ficam fora do git; o do painel tem prioridade.
type Lote = { default: { perfis: Perfil[]; servicos: Servico[]; avaliacoes?: Avaliacao[]; suspensos?: { slug: string; marca: string }[] } };
const lotes = import.meta.glob<Lote>(['/data/perfis-locais.json', '/data/publicado.json'], { eager: true });
const lLocal = lotes['/data/perfis-locais.json']?.default ?? { perfis: [], servicos: [] };
const lPainel = lotes['/data/publicado.json']?.default ?? { perfis: [], servicos: [] };
const slugsPainel = new Set(lPainel.perfis.map((p) => p.slug));
const idsLocaisFora = new Set(lLocal.perfis.filter((p) => slugsPainel.has(p.slug)).map((p) => p.id));
const extra = {
  perfis: [...lLocal.perfis.filter((p) => !slugsPainel.has(p.slug)), ...lPainel.perfis],
  servicos: [...lLocal.servicos.filter((s) => !idsLocaisFora.has(s.perfilId)), ...lPainel.servicos],
};
// Perfis fictícios só em desenvolvimento/testes ou com LHY_DEMO=1; em produção, só os reais.
const demo = import.meta.env.DEV || import.meta.env.MODE === 'test' || process.env.LHY_DEMO === '1';
const perfis = [...(demo ? semilla.perfis : []), ...extra.perfis];
const servicos = [...(demo ? semilla.servicos : []), ...extra.servicos];

export const adaptadorLocal: FonteDados = {
  async listarCategorias() {
    return semilla.categorias;
  },
  async listarRegioes() {
    return semilla.regioes;
  },
  async listarPerfisPublicos() {
    return perfis.filter((p) => p.status === 'aprobado');
  },
  async buscarPerfilPorSlug(slug) {
    return perfis.find((p) => p.slug === slug && p.status === 'aprobado') ?? null;
  },
  async listarSuspensos() {
    return (lPainel.suspensos ?? []).filter((s) => !perfis.some((p) => p.slug === s.slug && p.status === 'aprobado'));
  },
  async listarAvaliacoesDoPerfil(perfilId) {
    return (lPainel.avaliacoes ?? [])
      .filter((a) => a.perfilId === perfilId && a.status === 'aprobada')
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  },
  async listarServicosDoPerfil(perfilId) {
    return servicos
      .filter((s) => s.perfilId === perfilId && s.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  },
};
