// Envio de opinião pelo visitante. Leve: não carrega Firestore nem login.
// A gravação é feita pela função enviarOpiniao (servidor), que aplica os limites contra abuso.
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import { CONFIG_FIREBASE } from './config-firebase';
import { esperarToken, ligarAppCheck } from './app-check';

const EMULADOR = import.meta.env.PUBLIC_EMULADOR === '1';

export interface NovaOpiniao { perfilId: string; nome: string; email: string; nota: number; texto: string; site: string; ms: number }

const app = () => (getApps().length ? getApp() : initializeApp(EMULADOR ? { ...CONFIG_FIREBASE, projectId: 'demo-lohagoyo' } : CONFIG_FIREBASE));

/** Chamar ao abrir o formulário: já carrega a proteção invisível enquanto a pessoa escreve. */
export function prepararOpiniao(): void {
  void ligarAppCheck(app());
}

/** Envia a opinião. Lança Error com mensagem em espanhol se for recusada. */
export async function enviarOpiniao(o: NovaOpiniao): Promise<void> {
  await esperarToken(app());
  const fns = getFunctions(app(), 'southamerica-west1');
  if (EMULADOR) connectFunctionsEmulator(fns, '127.0.0.1', 5001);
  try {
    await httpsCallable(fns, 'enviarOpiniao')(o);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    throw new Error(err.code === 'functions/failed-precondition' && err.message ? err.message.replace(/\s*\[\d+\]\s*$/, '') : 'No se pudo enviar. Inténtalo de nuevo.');
  }
}
