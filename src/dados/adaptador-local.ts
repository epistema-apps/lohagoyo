// Adaptador com dados fictícios em memória (desenvolvimento).
// Perfis REAIS para teste local podem ficar em data/perfis-locais.json (fora do git).
import type { Perfil, Servico } from '../dominio/tipos';
import type { FonteDados } from './contrato';
import * as semilla from './semilla';

const locais = import.meta.glob<{ default: { perfis: Perfil[]; servicos: Servico[] } }>('/data/perfis-locais.json', { eager: true });
const extra = Object.values(locais)[0]?.default ?? { perfis: [], servicos: [] };
const perfis = [...semilla.perfis, ...extra.perfis];
const servicos = [...semilla.servicos, ...extra.servicos];

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
  async listarServicosDoPerfil(perfilId) {
    return servicos
      .filter((s) => s.perfilId === perfilId && s.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  },
};
