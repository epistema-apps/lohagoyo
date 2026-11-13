// Dados do painel do profissional e da moderação (Firestore + Storage).
// A interface usa só estas funções; nada de Firebase fora de src/dados e src/auth.
import {
  addDoc, collection, connectFirestoreEmulator, orderBy, deleteDoc, doc, getDoc, getDocs, getFirestore,
  query, runTransaction, setDoc, updateDoc, where, writeBatch, type Firestore,
} from 'firebase/firestore';
import { connectStorageEmulator, getDownloadURL, getStorage, ref, uploadBytes, type FirebaseStorage } from 'firebase/storage';
import { app, emulador } from '../auth';
import type { Avaliacao, Perfil, Servico, StatusAvaliacao } from '../dominio/tipos';

let _db: Firestore | null = null;
let _st: FirebaseStorage | null = null;
function db(): Firestore {
  if (!_db) {
    _db = getFirestore(app());
    if (emulador()) connectFirestoreEmulator(_db, '127.0.0.1', 8080);
  }
  return _db;
}
function st(): FirebaseStorage {
  if (!_st) {
    _st = getStorage(app());
    if (emulador()) connectStorageEmulator(_st, '127.0.0.1', 9199);
  }
  return _st;
}

const agora = () => new Date().toISOString();
/** Firestore não aceita undefined: remove campos vazios. */
function limpo<T extends object>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

export interface Privado { nomeCompleto: string; email: string; telefone?: string; documento?: string; rut?: string }
export interface MeusDados { perfil: Perfil | null; privado: Privado | null; servicos: Servico[] }

export async function carregarMeusDados(uid: string): Promise<MeusDados> {
  const [p, pr, sv] = await Promise.all([
    getDoc(doc(db(), 'perfis', uid)),
    getDoc(doc(db(), 'profissionais', uid)),
    getDocs(query(collection(db(), 'servicos'), where('perfilId', '==', uid))),
  ]);
  return {
    perfil: p.exists() ? (p.data() as Perfil) : null,
    privado: pr.exists() ? (pr.data() as Privado) : null,
    servicos: sv.docs.map((d) => ({ ...(d.data() as Servico), id: d.id })).sort((a, b) => a.ordem - b.ordem),
  };
}

/** Verifica se um endereço está livre (ou já é seu). */
export async function slugDisponivel(slug: string, uid: string): Promise<boolean> {
  const s = await getDoc(doc(db(), 'slugs', slug));
  return !s.exists() || s.data().uid === uid;
}

/** Reserva o slug (se preciso) e salva o perfil. Libera o slug antigo ao trocar. */
export async function salvarPerfil(perfil: Perfil, slugAnterior?: string): Promise<void> {
  const uid = perfil.id;
  // Reserva do endereço e perfil na MESMA transação: ou grava os dois, ou nenhum.
  await runTransaction(db(), async (t) => {
    const ref = doc(db(), 'slugs', perfil.slug);
    const s = await t.get(ref);
    if (s.exists() && s.data().uid !== uid) throw new Error('slug-ocupado');
    if (!s.exists()) t.set(ref, { uid, criadoEm: agora() });
    t.set(doc(db(), 'perfis', uid), limpo({ ...perfil, atualizadoEm: agora() }));
  });
  if (slugAnterior && slugAnterior !== perfil.slug) {
    await deleteDoc(doc(db(), 'slugs', slugAnterior)).catch(() => undefined);
  }
}

export async function salvarPrivado(uid: string, dados: Privado): Promise<void> {
  await setDoc(doc(db(), 'profissionais', uid), limpo({ ...dados, atualizadoEm: agora() }), { merge: true });
}

export async function salvarServico(s: Omit<Servico, 'id'> & { id?: string }): Promise<string> {
  const { id, ...resto } = s;
  const dados = limpo({ ...resto, atualizadoEm: agora() });
  if (id) {
    await setDoc(doc(db(), 'servicos', id), dados);
    return id;
  }
  const r = await addDoc(collection(db(), 'servicos'), { ...dados, criadoEm: agora() });
  return r.id;
}

export const apagarServico = (id: string) => deleteDoc(doc(db(), 'servicos', id));

/** Registra o consentimento e envia o perfil para revisão. */
export async function enviarParaRevisao(uid: string, versao: string, texto: string, registradoPor?: string): Promise<void> {
  await addDoc(collection(db(), 'consentimentos'), { uid, versao, texto, criadoEm: agora(), ...(registradoPor ? { registradoPor } : {}) });
  if (registradoPor) return; // cadastro assistido: o status já foi definido pelo administrador
  const p = await getDoc(doc(db(), 'perfis', uid));
  if (p.exists() && p.data().status !== 'aprobado') await updateDoc(doc(db(), 'perfis', uid), { status: 'pendiente', atualizadoEm: agora() });
}

/** Reduz a foto no navegador (máx. 1600 px, JPEG) antes de subir: rápido e barato. */
async function reduzir(arquivo: File, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(arquivo);
  const r = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * r);
  c.height = Math.round(bmp.height * r);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.85;
  let b: Blob | null = null;
  do {
    b = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', q));
    q -= 0.1;
  } while (b && b.size > 1.8 * 1024 * 1024 && q > 0.4);
  if (!b) throw new Error('foto-invalida');
  return b;
}

export type NomeFoto = 'capa' | 'retrato' | 'trabajo-1' | 'trabajo-2' | 'trabajo-3' | 'trabajo-4';

export async function subirFoto(uid: string, nome: NomeFoto, arquivo: File): Promise<string> {
  const blob = await reduzir(arquivo);
  const r = ref(st(), `perfis/${uid}/${nome}.jpg`);
  await uploadBytes(r, blob, { contentType: 'image/jpeg', cacheControl: 'public, max-age=86400' });
  return `${await getDownloadURL(r)}`;
}

/** Id para um perfil criado pelo administrador (cadastro assistido). */
export const novoIdAssistido = () => 'lhy' + Array.from(crypto.getRandomValues(new Uint8Array(14)), (b) => b.toString(16).padStart(2, '0')).join('');

// ---------- moderação ----------

export async function souModerador(): Promise<boolean> {
  try {
    await getDoc(doc(db(), 'config', 'moderadores'));
    return true;
  } catch {
    return false;
  }
}

export async function listarParaModerar(): Promise<{ perfil: Perfil; servicos: Servico[]; privado: Privado | null }[]> {
  const ps = await getDocs(collection(db(), 'perfis'));
  const perfis = ps.docs.map((d) => d.data() as Perfil);
  return Promise.all(
    perfis.map(async (perfil) => {
      const [sv, pr] = await Promise.all([
        getDocs(query(collection(db(), 'servicos'), where('perfilId', '==', perfil.id))),
        getDoc(doc(db(), 'profissionais', perfil.id)),
      ]);
      return {
        perfil,
        servicos: sv.docs.map((d) => ({ ...(d.data() as Servico), id: d.id })),
        privado: pr.exists() ? (pr.data() as Privado) : null,
      };
    }),
  );
}

export async function mudarStatus(uid: string, status: Perfil['status'], moderadorUid: string): Promise<void> {
  await updateDoc(doc(db(), 'perfis', uid), {
    status,
    atualizadoEm: agora(),
    ...(status === 'aprobado' ? { aprovadoPor: moderadorUid, aprovadoEm: agora() } : {}),
  });
}

// ---------- curadoria: o que vai ao site ----------

/** Copia a versão atual (perfil + serviços ativos) para `publicados` e marca como aprovado. Só administrador. */
export async function publicarPerfil(uid: string, moderadorUid: string): Promise<void> {
  const [p, sv] = await Promise.all([
    getDoc(doc(db(), 'perfis', uid)),
    getDocs(query(collection(db(), 'servicos'), where('perfilId', '==', uid))),
  ]);
  if (!p.exists()) throw new Error('perfil-inexistente');
  const t = agora();
  const atual = p.data() as Perfil;
  // saindo de uma auditoria (bloqueado): a contagem de avaliações negativas recomeça daqui
  const auditoria = atual.status === 'bloqueado' ? { auditadoEm: t } : {};
  const perfil = { ...atual, ...auditoria, status: 'aprobado' as const, aprovadoPor: moderadorUid, aprovadoEm: t };
  const servicos = sv.docs.map((d) => ({ ...(d.data() as Servico), id: d.id })).filter((s) => s.ativo !== false);
  const b = writeBatch(db());
  b.set(doc(db(), 'publicados', uid), limpo({ perfil, servicos, publicadoEm: t, publicadoPor: moderadorUid }));
  b.update(doc(db(), 'perfis', uid), { status: 'aprobado', aprovadoPor: moderadorUid, aprovadoEm: t, atualizadoEm: t, ...auditoria });
  await b.commit();
}

/** Tira do site (apaga a versão publicada) e pausa. Só administrador. */
export async function despublicarPerfil(uid: string): Promise<void> {
  const b = writeBatch(db());
  b.delete(doc(db(), 'publicados', uid));
  b.update(doc(db(), 'perfis', uid), { status: 'pausado', atualizadoEm: agora() });
  await b.commit();
}

/** Uids com versão publicada (para o admin saber o que já está no ar). */
export async function idsPublicados(): Promise<Set<string>> {
  const s = await getDocs(collection(db(), 'publicados'));
  return new Set(s.docs.map((d) => d.id));
}

/** Profissional mexeu num perfil já aprovado: volta para revisão (o site segue com a versão anterior). */
export async function marcarParaRevisao(uid: string): Promise<void> {
  const p = await getDoc(doc(db(), 'perfis', uid));
  if (p.exists() && p.data().status === 'aprobado') await updateDoc(doc(db(), 'perfis', uid), { status: 'pendiente', atualizadoEm: agora() });
}

// ---------- avaliações ----------

export type AvaliacaoAdmin = Avaliacao & { email?: string };

export async function listarAvaliacoesAdmin(): Promise<AvaliacaoAdmin[]> {
  const [av, pr] = await Promise.all([getDocs(collection(db(), 'avaliacoes')), getDocs(collection(db(), 'avaliacoesPrivado'))]);
  const emails = new Map(pr.docs.map((d) => [d.id, d.data().email as string]));
  return av.docs
    .map((d) => ({ ...(d.data() as Avaliacao), id: d.id, email: emails.get(d.id) }))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function atualizarAvaliacao(id: string, dados: Partial<Pick<Avaliacao, 'status' | 'texto' | 'nome' | 'nota' | 'resposta'>>): Promise<void> {
  await updateDoc(doc(db(), 'avaliacoes', id), limpo(dados));
}

export async function apagarAvaliacao(id: string): Promise<void> {
  const b = writeBatch(db());
  b.delete(doc(db(), 'avaliacoes', id));
  b.delete(doc(db(), 'avaliacoesPrivado', id));
  await b.commit();
}

/** Administrador insere uma avaliação (ex.: recebida por WhatsApp). */
export async function criarAvaliacaoAdmin(a: { perfilId: string; nome: string; nota: number; texto: string; status: StatusAvaliacao }): Promise<void> {
  await addDoc(collection(db(), 'avaliacoes'), { ...a, criadoEm: agora() });
}

/** Avaliações que o administrador enviou ao profissional, e as já publicadas. */
export async function minhasAvaliacoes(uid: string): Promise<Avaliacao[]> {
  const s = await getDocs(query(collection(db(), 'avaliacoes'), where('perfilId', '==', uid), where('status', 'in', ['en_contestacion', 'aprobada'])));
  return s.docs.map((d) => ({ ...(d.data() as Avaliacao), id: d.id })).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function responderAvaliacao(id: string, resposta: string, contestacao: string): Promise<void> {
  await updateDoc(doc(db(), 'avaliacoes', id), { resposta: resposta.trim(), contestacao: contestacao.trim(), respondidoEm: agora() });
}

// ---------- conversa privada sobre uma avaliação ----------

export interface Mensagem { id: string; autor: 'admin' | 'profissional'; texto: string; criadoEm: string }

export async function listarMensagens(avaliacaoId: string): Promise<Mensagem[]> {
  const s = await getDocs(query(collection(db(), 'avaliacoes', avaliacaoId, 'mensagens'), orderBy('criadoEm')));
  return s.docs.map((d) => ({ ...(d.data() as Mensagem), id: d.id }));
}

export async function enviarMensagem(avaliacaoId: string, autor: 'admin' | 'profissional', autorUid: string, texto: string): Promise<void> {
  await addDoc(collection(db(), 'avaliacoes', avaliacaoId, 'mensagens'), { autor, autorUid, texto: texto.trim(), criadoEm: agora() });
}
