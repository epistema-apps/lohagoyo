// Cores da tarjeta, todas da paleta LoHagoYo.cl.
import type { PapelLogo } from '../../marca/logo-dados';

export const PALETA = {
  cobalto: '#2433C8',
  amarelo: '#FFC61A',
  tinta: '#0E1230',
  branco: '#FFFFFF',
};

export type CoresLogo = Record<PapelLogo, string>;

export const LOGO_ESCURO: CoresLogo = { texto: '#FFFFFF', yo: '#FFC61A', ponto: '#FFC61A', dominio: '#C9CEF5' };
export const LOGO_CLARO: CoresLogo = { texto: '#0E1230', yo: '#2433C8', ponto: '#FFC61A', dominio: '#6A7090' };

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

export type TemaId = 'cobalto' | 'tinta' | 'blanco' | 'amarillo';

export const TEMAS: Record<TemaId, TemaCartao> = {
  cobalto: {
    id: 'cobalto', nome: 'Azul', fundo: PALETA.cobalto, texto: '#FFFFFF', suave: '#C9CEF5',
    acento: PALETA.amarelo, painel: PALETA.tinta, circulo: PALETA.amarelo, logo: LOGO_ESCURO,
  },
  tinta: {
    id: 'tinta', nome: 'Noche', fundo: PALETA.tinta, texto: '#FFFFFF', suave: '#A3A8C3',
    acento: PALETA.amarelo, painel: PALETA.cobalto, circulo: PALETA.cobalto, logo: LOGO_ESCURO,
  },
  blanco: {
    id: 'blanco', nome: 'Blanco', fundo: PALETA.branco, texto: PALETA.tinta, suave: '#6A7090',
    acento: PALETA.cobalto, painel: PALETA.cobalto, circulo: PALETA.amarelo, logo: LOGO_CLARO,
  },
  amarillo: {
    id: 'amarillo', nome: 'Amarillo', fundo: PALETA.amarelo, texto: PALETA.tinta, suave: '#5C4A00',
    acento: PALETA.cobalto, painel: PALETA.tinta, circulo: PALETA.cobalto,
    logo: { texto: PALETA.tinta, yo: PALETA.cobalto, ponto: '#FFFFFF', dominio: '#5C4A00' },
  },
};
