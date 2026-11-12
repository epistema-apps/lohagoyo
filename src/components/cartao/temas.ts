// Cores da tarjeta, todas da paleta LoHagoYo.cl (sóbria: grafito, piedra, ocre).
import type { PapelLogo } from '../../marca/logo-dados';

export const PALETA = {
  grafito: '#15171C',
  pizarra: '#2B2F36',
  piedra: '#F4F3F0',
  branco: '#FFFFFF',
  ocre: '#9C7636',
  ocreSuave: '#D9B87A',
};

export type CoresLogo = Record<PapelLogo, string>;

export const LOGO_ESCURO: CoresLogo = { texto: '#FFFFFF', yo: '#D9B87A', ponto: '#D9B87A', dominio: '#A5A8AE' };
export const LOGO_CLARO: CoresLogo = { texto: '#15171C', yo: '#9C7636', ponto: '#C79B4B', dominio: '#8A8D94' };

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
    id: 'grafito', nome: 'Grafito', fundo: PALETA.grafito, texto: '#FFFFFF', suave: '#A5A8AE',
    acento: PALETA.ocreSuave, painel: '#24272E', circulo: '#24272E', logo: LOGO_ESCURO,
  },
  pizarra: {
    id: 'pizarra', nome: 'Pizarra', fundo: PALETA.pizarra, texto: '#FFFFFF', suave: '#B3B6BC',
    acento: PALETA.ocreSuave, painel: PALETA.grafito, circulo: '#3A3F48', logo: LOGO_ESCURO,
  },
  blanco: {
    id: 'blanco', nome: 'Blanco', fundo: PALETA.branco, texto: PALETA.grafito, suave: '#6B6E76',
    acento: PALETA.ocre, painel: PALETA.grafito, circulo: PALETA.piedra, logo: LOGO_CLARO,
  },
  piedra: {
    id: 'piedra', nome: 'Piedra', fundo: PALETA.piedra, texto: PALETA.grafito, suave: '#6B6E76',
    acento: PALETA.ocre, painel: PALETA.pizarra, circulo: '#E8E5DE', logo: LOGO_CLARO,
  },
};
