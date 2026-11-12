// Adaptador com dados fictícios em memória (desenvolvimento).
import type { FonteDados } from './contrato';
import * as semilla from './semilla';

export const adaptadorLocal: FonteDados = {
  async listarCategorias() {
    return semilla.categorias;
  },
  async listarRegioes() {
    return semilla.regioes;
  },
  async listarPerfisPublicos() {
    return semilla.perfis.filter((p) => p.status === 'aprobado');
  },
  async buscarPerfilPorSlug(slug) {
    return semilla.perfis.find((p) => p.slug === slug && p.status === 'aprobado') ?? null;
  },
  async listarServicosDoPerfil(perfilId) {
    return semilla.servicos
      .filter((s) => s.perfilId === perfilId && s.ativo)
      .sort((a, b) => a.ordem - b.ordem);
  },
};
