// Login do painel. Único lugar (junto com src/dados/) que conhece o Firebase.
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  GoogleAuthProvider, connectAuthEmulator, createUserWithEmailAndPassword, getAuth, onAuthStateChanged,
  sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut,
  updateProfile, type Auth,
} from 'firebase/auth';
import { CONFIG_FIREBASE } from '../dados/config-firebase';
import { ligarAppCheck } from '../dados/app-check';

export interface Usuario { uid: string; email: string | null; nome: string | null }

const EMULADOR = import.meta.env.PUBLIC_EMULADOR === '1';
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

export function app(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApp() : initializeApp(EMULADOR ? { ...CONFIG_FIREBASE, projectId: 'demo-lohagoyo' } : CONFIG_FIREBASE);
    void ligarAppCheck(_app);
  }
  return _app;
}
export const emulador = () => EMULADOR;

function auth(): Auth {
  if (!_auth) {
    _auth = getAuth(app());
    _auth.languageCode = 'es';
    if (EMULADOR) connectAuthEmulator(_auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return _auth;
}

export function observarUsuario(cb: (u: Usuario | null) => void): () => void {
  return onAuthStateChanged(auth(), (u) => cb(u ? { uid: u.uid, email: u.email, nome: u.displayName } : null));
}

export async function entrarComGoogle(): Promise<void> {
  await signInWithPopup(auth(), new GoogleAuthProvider());
}

/** Cria a conta com qualquer e-mail e senha (não precisa ser Gmail). */
export async function criarConta(nome: string, email: string, senha: string): Promise<void> {
  const r = await createUserWithEmailAndPassword(auth(), email, senha);
  if (nome) await updateProfile(r.user, { displayName: nome });
  await sendEmailVerification(r.user, { url: `${location.origin}/panel/` }).catch(() => undefined);
}

export async function entrarComSenha(email: string, senha: string): Promise<void> {
  await signInWithEmailAndPassword(auth(), email, senha);
}

export async function recuperarSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(auth(), email, { url: `${location.origin}/panel/` });
}

/** Traduz os erros do Firebase para mensagens claras em espanhol. */
export function mensagemErro(e: unknown): string {
  const c = (e as { code?: string })?.code ?? '';
  if (c.includes('email-already-in-use')) return 'Ya existe una cuenta con ese correo. Entra con tu contraseña.';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found')) return 'Correo o contraseña incorrectos.';
  if (c.includes('weak-password')) return 'La contraseña debe tener al menos 6 caracteres.';
  if (c.includes('invalid-email')) return 'Revisa el correo: no parece válido.';
  if (c.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos.';
  if (c.includes('popup-closed')) return 'Se cerró la ventana de Google.';
  return 'Algo salió mal. Inténtalo de nuevo.';
}

export const sair = () => signOut(auth());

/** Renova a credencial para aplicar permissões dadas depois do login (ex.: administrador). */
export async function atualizarPermissoes(): Promise<boolean> {
  const u = auth().currentUser;
  if (!u) return false;
  const t = await u.getIdTokenResult(true);
  return t.claims.mod === true;
}
