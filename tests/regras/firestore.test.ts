import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Pessoas fictícias.
const ANA = 'uid-ana';
const BETO = 'uid-beto';
const MOD = 'uid-moderador';

let env: RulesTestEnvironment;

const perfil = (uid: string, extra: Record<string, unknown> = {}) => ({
  id: uid, slug: `${uid}-slug`, nomePublico: 'Ana Ejemplo', oficio: 'Jardinería', apresentacao: 'Hola',
  categoriaIds: ['jardineria'], regiaoId: 'santiago', comunas: ['Ñuñoa'], publicos: ['casas'], contatos: {},
  endereco: { calle: 'Calle Ejemplo', numero: '123', comuna: 'Ñuñoa' },
  fotos: [], layout: 'foto', pagamentos: [], emiteBoleta: false, tipoPessoa: 'persona_natural',
  retrato: 'https://exemplo/retrato.jpg', status: 'pendiente', criadoEm: 'x', atualizadoEm: 'x', ...extra,
});
const servico = (uid: string) => ({ perfilId: uid, nome: 'Corte', descricao: 'd', incluye: [], preco: { tipo: 'desde', valor: 1, mostrar: true } });

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-lohagoyo', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, 'config/moderadores'), { uids: [MOD] });
    await setDoc(doc(db, `slugs/${ANA}-slug`), { uid: ANA, criadoEm: 'x' });
    await setDoc(doc(db, `slugs/${BETO}-slug`), { uid: BETO, criadoEm: 'x' });
  });
});

const db = (uid?: string) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
const semRegras = (fn: (d: ReturnType<typeof db>) => Promise<unknown>) => env.withSecurityRulesDisabled((c) => fn(c.firestore()) as Promise<void>);

describe('slugs', () => {
  it('reserva um slug livre para si; não para outro nem com formato inválido; não toma ocupado', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), 'slugs/ana-jardines'), { uid: ANA, criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(ANA), 'slugs/outro'), { uid: BETO, criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(ANA), 'slugs/Mal Slug'), { uid: ANA, criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(ANA), `slugs/${BETO}-slug`), { uid: ANA, criadoEm: 'x' }));
  });
});

describe('perfis (cópia de trabalho)', () => {
  it('reserva o endereço e cria o perfil na mesma operação', async () => {
    const f = db(ANA);
    const b = writeBatch(f);
    b.set(doc(f, 'slugs/ana-nueva'), { uid: ANA, criadoEm: 'x' });
    b.set(doc(f, `perfis/${ANA}`), perfil(ANA, { slug: 'ana-nueva' }));
    await assertSucceeds(b.commit());
  });
  it('o dono cria pendente; não cria aprovado nem no lugar de outro, nem com slug alheio ou campos extras', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA)));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { status: 'aprobado' })));
    await assertFails(setDoc(doc(db(ANA), `perfis/${BETO}`), perfil(BETO)));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { slug: `${ANA}-slug` })));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { hack: true })));
  });
  it('rascunho pode ser incompleto; para revisão exige categoria, foto e endereço completo', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { status: 'borrador', categoriaIds: [], retrato: '', endereco: {} })));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { retrato: '' })));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { endereco: { calle: 'X', numero: '', comuna: 'Y' } })));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { categoriaIds: [] })));
  });
  it('ninguém de fora lê a cópia de trabalho; dono e moderador sim', async () => {
    await semRegras((d) => setDoc(doc(d, `perfis/${ANA}`), perfil(ANA, { status: 'aprobado' })));
    await assertFails(getDoc(doc(db(), `perfis/${ANA}`)));
    await assertFails(getDoc(doc(db(BETO), `perfis/${ANA}`)));
    await assertSucceeds(getDoc(doc(db(ANA), `perfis/${ANA}`)));
    await assertSucceeds(getDoc(doc(db(MOD), `perfis/${ANA}`)));
  });
  it('perfil aprovado: o dono edita só voltando para revisão; não mexe na aprovação', async () => {
    await semRegras((d) => setDoc(doc(d, `perfis/${ANA}`), perfil(ANA, { status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' })));
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { lema: 'Nuevo' })); // continuaria aprobado
    await assertSucceeds(updateDoc(doc(db(ANA), `perfis/${ANA}`), { lema: 'Nuevo', status: 'pendiente' }));
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { aprovadoPor: ANA }));
  });
  it('bloqueado por avaliações: o dono não edita; o moderador desbloqueia', async () => {
    await semRegras((d) => setDoc(doc(d, `perfis/${ANA}`), perfil(ANA, { status: 'bloqueado', motivoBloqueio: '5 evaluaciones malas' })));
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { lema: 'x', status: 'pendiente' }));
    await assertSucceeds(updateDoc(doc(db(MOD), `perfis/${ANA}`), { status: 'aprobado' }));
  });
  it('auditoria: só o moderador marca auditadoEm (o dono não zera a contagem)', async () => {
    await semRegras((d) => setDoc(doc(d, `perfis/${ANA}`), perfil(ANA, { status: 'aprobado', auditadoEm: '2026-01-01' })));
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { status: 'pendiente', auditadoEm: '2099-01-01' }));
    await assertSucceeds(updateDoc(doc(db(ANA), `perfis/${ANA}`), { status: 'pendiente', lema: 'nuevo' }));
    await assertSucceeds(updateDoc(doc(db(MOD), `perfis/${ANA}`), { auditadoEm: '2026-11-12' }));
  });
  it('outra pessoa não edita nem apaga; moderador aprova', async () => {
    await semRegras((d) => setDoc(doc(d, `perfis/${ANA}`), perfil(ANA)));
    await assertFails(updateDoc(doc(db(BETO), `perfis/${ANA}`), { lema: 'x' }));
    await assertFails(deleteDoc(doc(db(BETO), `perfis/${ANA}`)));
    await assertSucceeds(updateDoc(doc(db(MOD), `perfis/${ANA}`), { status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' }));
  });
});

describe('publicados (o que vai ao site)', () => {
  it('todos leem; só o moderador grava', async () => {
    await assertFails(setDoc(doc(db(ANA), `publicados/${ANA}`), { perfil: perfil(ANA), servicos: [] }));
    await assertSucceeds(setDoc(doc(db(MOD), `publicados/${ANA}`), { perfil: perfil(ANA), servicos: [] }));
    await assertSucceeds(getDoc(doc(db(), `publicados/${ANA}`)));
    await assertSucceeds(getDocs(collection(db(), 'publicados')));
    await assertFails(deleteDoc(doc(db(ANA), `publicados/${ANA}`)));
  });
});

describe('serviços (cópia de trabalho)', () => {
  it('o dono cria; ninguém cria no perfil de outro; tipo de preço validado', async () => {
    await assertSucceeds(addDoc(collection(db(ANA), 'servicos'), servico(ANA)));
    await assertFails(addDoc(collection(db(ANA), 'servicos'), servico(BETO)));
    await assertFails(addDoc(collection(db(ANA), 'servicos'), { ...servico(ANA), preco: { tipo: 'gratis' } }));
  });
  it('visitante não lê serviços; dono e moderador leem', async () => {
    await semRegras((d) => setDoc(doc(d, 'servicos/sa'), servico(ANA)));
    await assertFails(getDoc(doc(db(), 'servicos/sa')));
    await assertSucceeds(getDoc(doc(db(ANA), 'servicos/sa')));
    await assertSucceeds(getDocs(query(collection(db(MOD), 'servicos'), where('perfilId', '==', ANA))));
  });
});

describe('avaliações', () => {
  const nova = (perfilId: string, extra: Record<string, unknown> = {}) => ({ perfilId, nome: 'Cliente', nota: 5, texto: 'Muy bien', status: 'por_confirmar', criadoEm: 'x', ...extra });
  const enviar = async (d: ReturnType<typeof db>, id: string, a: Record<string, unknown>, email = 'c@ejemplo.test') => {
    const b = writeBatch(d);
    b.set(doc(d, `avaliacoes/${id}`), a);
    b.set(doc(d, `avaliacoesPrivado/${id}`), { email, token: 'tok123', criadoEm: 'x' });
    return b.commit();
  };
  beforeEach(async () => { await semRegras((d) => setDoc(doc(d, `publicados/${ANA}`), { perfil: perfil(ANA), servicos: [] })); });

  it('ninguém grava opinião direto no banco (só pela função do servidor); o moderador pode inserir', async () => {
    await assertFails(enviar(db(), 'a1', nova(ANA)));
    await assertFails(enviar(db(ANA), 'a2', nova(ANA)));
    await assertFails(setDoc(doc(db(), 'avaliacoes/a3'), nova(ANA)));
    await assertFails(setDoc(doc(db(), 'avaliacoesPrivado/a4'), { email: 'c@ejemplo.test', token: 't', criadoEm: 'x' }));
    await assertSucceeds(setDoc(doc(db(MOD), 'avaliacoes/a5'), nova(ANA, { status: 'aprobada' })));
  });
  it('e-mail de quem avalia: só o moderador lê', async () => {
    await semRegras((d) => setDoc(doc(d, 'avaliacoesPrivado/p1'), { email: 'c@ejemplo.test', token: 't', criadoEm: 'x' }));
    await assertFails(getDoc(doc(db(), 'avaliacoesPrivado/p1')));
    await assertFails(getDoc(doc(db(ANA), 'avaliacoesPrivado/p1')));
    await assertSucceeds(getDoc(doc(db(MOD), 'avaliacoesPrivado/p1')));
  });
  it('público vê só aprovadas; profissional vê as enviadas a ele e as aprovadas', async () => {
    await semRegras(async (d) => {
      await setDoc(doc(d, 'avaliacoes/pend'), nova(ANA, { status: 'pendiente' }));
      await setDoc(doc(d, 'avaliacoes/cont'), nova(ANA, { status: 'en_contestacion' }));
      await setDoc(doc(d, 'avaliacoes/ok'), nova(ANA, { status: 'aprobada' }));
    });
    await assertFails(getDoc(doc(db(), 'avaliacoes/pend')));
    await assertSucceeds(getDoc(doc(db(), 'avaliacoes/ok')));
    await assertSucceeds(getDocs(query(collection(db(), 'avaliacoes'), where('status', '==', 'aprobada'))));
    await assertFails(getDoc(doc(db(ANA), 'avaliacoes/pend')));
    await assertSucceeds(getDoc(doc(db(ANA), 'avaliacoes/cont')));
    await assertFails(getDoc(doc(db(BETO), 'avaliacoes/cont')));
  });
  it('profissional só responde/contesta quando o admin envia; não muda status nem texto', async () => {
    await semRegras(async (d) => {
      await setDoc(doc(d, 'avaliacoes/cont'), nova(ANA, { status: 'en_contestacion' }));
      await setDoc(doc(d, 'avaliacoes/pend'), nova(ANA, { status: 'pendiente' }));
    });
    await assertSucceeds(updateDoc(doc(db(ANA), 'avaliacoes/cont'), { resposta: 'Gracias', contestacao: 'No fue así', respondidoEm: 'x' }));
    await assertFails(updateDoc(doc(db(ANA), 'avaliacoes/cont'), { status: 'aprobada' }));
    await assertFails(updateDoc(doc(db(ANA), 'avaliacoes/cont'), { texto: 'editado' }));
    await assertFails(updateDoc(doc(db(ANA), 'avaliacoes/pend'), { resposta: 'x' }));
    await assertFails(updateDoc(doc(db(BETO), 'avaliacoes/cont'), { resposta: 'x' }));
  });
  it('conversa privada: só moderação e o profissional dono; cada um assina como si mesmo', async () => {
    await semRegras((d) => setDoc(doc(d, 'avaliacoes/cont'), nova(ANA, { status: 'en_contestacion' })));
    const msg = (autor: string, uid: string) => ({ autor, autorUid: uid, texto: 'Hola', criadoEm: 'x' });
    await assertSucceeds(addDoc(collection(db(MOD), 'avaliacoes/cont/mensagens'), msg('admin', MOD)));
    await assertSucceeds(addDoc(collection(db(ANA), 'avaliacoes/cont/mensagens'), msg('profissional', ANA)));
    await assertFails(addDoc(collection(db(ANA), 'avaliacoes/cont/mensagens'), msg('admin', ANA)));
    await assertFails(addDoc(collection(db(BETO), 'avaliacoes/cont/mensagens'), msg('profissional', BETO)));
    await assertSucceeds(getDocs(collection(db(ANA), 'avaliacoes/cont/mensagens')));
    await assertFails(getDocs(collection(db(BETO), 'avaliacoes/cont/mensagens')));
    await assertFails(getDocs(collection(db(), 'avaliacoes/cont/mensagens')));
  });
  it('moderador aprova, edita, apaga e insere avaliações', async () => {
    await semRegras((d) => setDoc(doc(d, 'avaliacoes/pend'), nova(ANA, { status: 'pendiente' })));
    await assertSucceeds(updateDoc(doc(db(MOD), 'avaliacoes/pend'), { status: 'aprobada', texto: 'editado' }));
    await assertSucceeds(setDoc(doc(db(MOD), 'avaliacoes/manual'), nova(ANA, { status: 'aprobada' })));
    await assertSucceeds(deleteDoc(doc(db(MOD), 'avaliacoes/pend')));
    await assertFails(deleteDoc(doc(db(ANA), 'avaliacoes/manual')));
  });
});

describe('cadastro assistido (administrador)', () => {
  it('o moderador cria perfil, slug, dados privados, serviço e consentimento de outra pessoa', async () => {
    const m = db(MOD);
    await assertSucceeds(setDoc(doc(m, 'slugs/carla-pintura'), { uid: 'uid-carla', criadoEm: 'x' }));
    await assertSucceeds(setDoc(doc(m, 'perfis/uid-carla'), perfil('uid-carla', { slug: 'carla-pintura', status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' })));
    await assertSucceeds(setDoc(doc(m, 'profissionais/uid-carla'), { nomeCompleto: 'Carla Ejemplo', email: '' }));
    await assertSucceeds(addDoc(collection(m, 'servicos'), { ...servico('uid-carla') }));
    await assertSucceeds(setDoc(doc(m, 'consentimentos/c-carla'), { uid: 'uid-carla', versao: 'v', texto: 't', criadoEm: 'x', registradoPor: MOD }));
  });
  it('quem não é moderador não cadastra por outra pessoa', async () => {
    await assertFails(setDoc(doc(db(BETO), 'slugs/carla-pintura'), { uid: 'uid-carla', criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(BETO), 'profissionais/uid-carla'), { nomeCompleto: 'X', email: '' }));
    await assertFails(setDoc(doc(db(BETO), 'consentimentos/c2'), { uid: 'uid-carla', versao: 'v', texto: 't', criadoEm: 'x', registradoPor: BETO }));
  });
  it('a permissão de administrador também vale pela claim mod', async () => {
    const m = env.authenticatedContext('uid-admin2', { mod: true }).firestore();
    await assertSucceeds(getDoc(doc(m, 'config/moderadores')));
  });
});

describe('dados privados, consentimentos, denúncias e config', () => {
  it('privados: só dono e moderador', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `profissionais/${ANA}`), { nomeCompleto: 'Ana Ejemplo Soto', email: 'a@ejemplo.test' }));
    await assertSucceeds(getDoc(doc(db(MOD), `profissionais/${ANA}`)));
    await assertFails(getDoc(doc(db(BETO), `profissionais/${ANA}`)));
    await assertFails(getDoc(doc(db(), `profissionais/${ANA}`)));
  });
  it('RUT fica no privado, só em formato normalizado', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `profissionais/${ANA}`), { nomeCompleto: 'Ana Ejemplo Soto', email: '', rut: '11111111-1' }));
    await assertFails(setDoc(doc(db(ANA), `profissionais/${ANA}`), { nomeCompleto: 'Ana Ejemplo Soto', email: '', rut: '11.111.111-1' }));
    await assertFails(getDoc(doc(db(BETO), `profissionais/${ANA}`)));
  });
  it('consentimento só se cria; denúncia fechada ao público, lida só pelo moderador; config protegida', async () => {
    const ref = doc(db(ANA), 'consentimentos/c1');
    await assertSucceeds(setDoc(ref, { uid: ANA, versao: '2026-11', texto: 'acepto', criadoEm: 'x' }));
    await assertFails(updateDoc(ref, { versao: 'outra' }));
    await assertFails(setDoc(doc(db(), 'denuncias/d1'), { perfilId: ANA, motivo: 'spam', criadoEm: 'x' }));
    await semRegras((d) => setDoc(doc(d, 'denuncias/d1'), { perfilId: ANA, motivo: 'spam', criadoEm: 'x' }));
    await assertFails(getDoc(doc(db(ANA), 'denuncias/d1')));
    await assertSucceeds(getDoc(doc(db(MOD), 'denuncias/d1')));
    await assertFails(getDoc(doc(db(ANA), 'config/moderadores')));
    await assertFails(setDoc(doc(db(MOD), 'config/moderadores'), { uids: [ANA] }));
  });
});
