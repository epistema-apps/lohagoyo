// Cores da tarjeta, todas da paleta LoHagoYo.cl (sóbria: grafito, piedra, tijolo).
import type { PapelLogo } from '../../marca/logo-dados';

export const PALETA = {
  grafito: '#2E3033',
  pizarra: '#3B3D40',
  piedra: '#E6E6E4',
  branco: '#FFFFFF',
  tijolo: '#A23B2A',
  tijoloSuave: '#E28A72',
};

export type CoresLogo = Record<PapelLogo, string>;

export const LOGO_ESCURO: CoresLogo = { texto: '#FFFFFF', yo: '#E28A72', ponto: '#E28A72', dominio: '#A39E97' };
export const LOGO_CLARO: CoresLogo = { texto: '#1A1918', yo: '#A23B2A', ponto: '#C4513B', dominio: '#8A857E' };

export interface TemaCartao {
  id: TemaId;
  nome: string;
  fundo: string;
  texto: string;
  suave: string; // texto secundário
  acento: string; // detalhes sobre o fundo
  painel: string; // faixas/painéis (sempre escuro)
  circulo: string; // elemento gráfico grande
  logo: CoresLogo; // logo sobre o fundo
}

export type TemaId = 'grafito' | 'pizarra' | 'blanco' | 'piedra';

export const TEMAS: Record<TemaId, TemaCartao> = {
  grafito: {
    id: 'grafito', nome: 'Grafito', fundo: PALETA.grafito, texto: '#FFFFFF', suave: '#A39E97',
    acento: PALETA.tijoloSuave, painel: '#3B3D40', circulo: '#262422', logo: LOGO_ESCURO,
  },
  pizarra: {
    id: 'pizarra', nome: 'Grafito medio', fundo: PALETA.pizarra, texto: '#FFFFFF', suave: '#B4B6B9',
    acento: PALETA.tijoloSuave, painel: PALETA.grafito, circulo: '#4A4C50', logo: LOGO_ESCURO,
  },
  blanco: {
    id: 'blanco', nome: 'Blanco', fundo: PALETA.branco, texto: PALETA.grafito, suave: '#6F6A64',
    acento: PALETA.tijolo, painel: PALETA.grafito, circulo: PALETA.piedra, logo: LOGO_CLARO,
  },
  piedra: {
    id: 'piedra', nome: 'Gris claro', fundo: PALETA.piedra, texto: PALETA.grafito, suave: '#6F6A64',
    acento: PALETA.tijolo, painel: PALETA.pizarra, circulo: '#D6D6D4', logo: LOGO_CLARO,
  },
};
