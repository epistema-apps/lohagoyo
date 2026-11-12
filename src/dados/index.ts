// Ponto único de acesso aos dados. Troca de adaptador = troca aqui.
// Fase 3: escolher adaptador-firebase quando FONTE_DADOS=firebase.
import { adaptadorLocal } from './adaptador-local';
import type { FonteDados } from './contrato';

export const dados: FonteDados = adaptadorLocal;
export type { FonteDados };
