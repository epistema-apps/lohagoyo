import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

// Pessoas fictícias.
const ANA = 'uid-ana';
const BETO = 'uid-beto';
const MOD = 'uid-moderador';

let env: RulesTestEnvironment;

const perfil = (uid: string, extra: Record<string, unknown> = {}) => ({
  id: uid, slug: `${uid}-slug`, nomePublico: 'Ana Ejemplo', oficio: 'Jardinería', apresentacao: 'Hola',
  categoriaIds: ['jardineria'], regiaoId: 'santiago', comunas: ['Ñuñoa'], publicos: ['casas'], contatos: {},
  fotos: [], layout: 'foto', pagamentos: [], emiteBoleta: false, tipoPessoa: 'persona_natural',
  retrato: 'https://exemplo/retrato.jpg', status: 'pendiente', criadoEm: 'x', atualizadoEm: 'x', ...extra,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-lohagoyo',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
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

describe('slugs', () => {
  it('reserva um slug livre para si', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), 'slugs/ana-jardines'), { uid: ANA, criadoEm: 'x' }));
  });
  it('não reserva para outra pessoa nem com formato inválido', async () => {
    await assertFails(setDoc(doc(db(ANA), 'slugs/outro'), { uid: BETO, criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(ANA), 'slugs/Mal Slug'), { uid: ANA, criadoEm: 'x' }));
  });
  it('não toma um slug que já existe', async () => {
    await assertFails(setDoc(doc(db(ANA), `slugs/${BETO}-slug`), { uid: ANA, criadoEm: 'x' }));
  });
});

describe('perfis', () => {
  it('reserva o endereço e cria o perfil na mesma operação', async () => {
    const { writeBatch } = await import('firebase/firestore');
    const f = db(ANA); // mesma instância para o lote inteiro
    const b = writeBatch(f);
    b.set(doc(f, 'slugs/ana-nueva'), { uid: ANA, criadoEm: 'x' });
    b.set(doc(f, `perfis/${ANA}`), perfil(ANA, { slug: 'ana-nueva' }));
    await assertSucceeds(b.commit());
  });
  it('o dono cria o próprio perfil como pendente', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA)));
  });
  it('ninguém cria perfil já aprovado nem no lugar de outro', async () => {
    await assertFails(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { status: 'aprobado' })));
    await assertFails(setDoc(doc(db(ANA), `perfis/${BETO}`), perfil(BETO)));
  });
  it('rascunho pode ser salvo sem categoria; para revisão precisa', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { status: 'borrador', categoriaIds: [] })));
    await assertFails(setDoc(doc(db(BETO), `perfis/${BETO}`), perfil(BETO, { categoriaIds: [] })));
  });
  it('sem foto da pessoa só pode ficar como rascunho', async () => {
    await assertFails(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { retrato: '' })));
    await assertSucceeds(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { retrato: '', status: 'borrador' })));
  });
  it('não usa slug de outra pessoa', async () => {
    await assertFails(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { slug: `${BETO}-slug` })));
  });
  it('não aceita campos extras nem mais de 4 fotos', async () => {
    await assertFails(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { hack: true })));
    await assertFails(setDoc(doc(db(ANA), `perfis/${ANA}`), perfil(ANA, { fotos: ['a', 'b', 'c', 'd', 'e'] })));
  });
  it('visitante não lê pendente, mas lê aprovado', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `perfis/${ANA}`), perfil(ANA));
      await setDoc(doc(c.firestore(), `perfis/${BETO}`), perfil(BETO, { status: 'aprobado' }));
    });
    await assertFails(getDoc(doc(db(), `perfis/${ANA}`)));
    await assertSucceeds(getDoc(doc(db(), `perfis/${BETO}`)));
    await assertSucceeds(getDocs(query(collection(db(), 'perfis'), where('status', '==', 'aprobado'))));
    await assertFails(getDocs(collection(db(), 'perfis')));
  });
  it('o dono não se aprova; o moderador aprova', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), `perfis/${ANA}`), perfil(ANA)); });
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { status: 'aprobado' }));
    await assertSucceeds(updateDoc(doc(db(MOD), `perfis/${ANA}`), { status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' }));
  });
  it('perfil aprovado: o dono edita e continua publicado, mas não mexe na aprovação', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `perfis/${ANA}`), perfil(ANA, { status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' }));
    });
    await assertSucceeds(updateDoc(doc(db(ANA), `perfis/${ANA}`), { lema: 'Nuevo' }));
    await assertFails(updateDoc(doc(db(ANA), `perfis/${ANA}`), { aprovadoPor: ANA }));
    await assertSucceeds(updateDoc(doc(db(ANA), `perfis/${ANA}`), { status: 'pausado' }));
  });
  it('outra pessoa não edita nem apaga', async () => {
    await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), `perfis/${ANA}`), perfil(ANA)); });
    await assertFails(updateDoc(doc(db(BETO), `perfis/${ANA}`), { lema: 'x' }));
    await assertFails(deleteDoc(doc(db(BETO), `perfis/${ANA}`)));
  });
});

describe('cadastro assistido (administrador)', () => {
  it('o moderador cria perfil, slug, dados privados, serviço e consentimento de outra pessoa', async () => {
    const m = db(MOD);
    await assertSucceeds(setDoc(doc(m, 'slugs/carla-pintura'), { uid: 'uid-carla', criadoEm: 'x' }));
    await assertSucceeds(setDoc(doc(m, 'perfis/uid-carla'), perfil('uid-carla', { slug: 'carla-pintura', status: 'aprobado', aprovadoPor: MOD, aprovadoEm: 'x' })));
    await assertSucceeds(setDoc(doc(m, 'profissionais/uid-carla'), { nomeCompleto: 'Carla Ejemplo', email: '' }));
    await assertSucceeds(addDoc(collection(m, 'servicos'), { perfilId: 'uid-carla', nome: 'Pintura', descricao: 'd', incluye: [], preco: { tipo: 'a_cotizar', mostrar: true } }));
    await assertSucceeds(setDoc(doc(m, 'consentimentos/c-carla'), { uid: 'uid-carla', versao: 'v', texto: 't', criadoEm: 'x', registradoPor: MOD }));
  });
  it('quem não é moderador não faz cadastro por outra pessoa', async () => {
    await assertFails(setDoc(doc(db(BETO), 'slugs/carla-pintura'), { uid: 'uid-carla', criadoEm: 'x' }));
    await assertFails(setDoc(doc(db(BETO), 'profissionais/uid-carla'), { nomeCompleto: 'X', email: '' }));
    await assertFails(setDoc(doc(db(BETO), 'consentimentos/c2'), { uid: 'uid-carla', versao: 'v', texto: 't', criadoEm: 'x', registradoPor: BETO }));
  });
  it('a permissão de administrador também vale pela claim mod', async () => {
    const m = env.authenticatedContext('uid-admin2', { mod: true }).firestore();
    await assertSucceeds(getDoc(doc(m, 'config/moderadores')));
  });
});

describe('dados privados', () => {
  it('só o dono e o moderador leem', async () => {
    await assertSucceeds(setDoc(doc(db(ANA), `profissionais/${ANA}`), { nomeCompleto: 'Ana Ejemplo Soto', email: 'a@ejemplo.cl' }));
    await assertSucceeds(getDoc(doc(db(ANA), `profissionais/${ANA}`)));
    await assertSucceeds(getDoc(doc(db(MOD), `profissionais/${ANA}`)));
    await assertFails(getDoc(doc(db(BETO), `profissionais/${ANA}`)));
    await assertFails(getDoc(doc(db(), `profissionais/${ANA}`)));
  });
});

describe('serviços', () => {
  const servico = (uid: string) => ({ perfilId: uid, nome: 'Corte', descricao: 'd', incluye: [], preco: { tipo: 'desde', valor: 1, mostrar: true } });
  it('o dono cria serviço; ninguém cria no perfil de outro', async () => {
    await assertSucceeds(addDoc(collection(db(ANA), 'servicos'), servico(ANA)));
    await assertFails(addDoc(collection(db(ANA), 'servicos'), servico(BETO)));
    await assertFails(addDoc(collection(db(ANA), 'servicos'), { ...servico(ANA), preco: { tipo: 'gratis' } }));
  });
  it('visitante só lê serviço de perfil aprovado', async () => {
    await env.withSecurityRulesDisabled(async (c) => {
      await setDoc(doc(c.firestore(), `perfis/${ANA}`), perfil(ANA));
      await setDoc(doc(c.firestore(), `perfis/${BETO}`), perfil(BETO, { status: 'aprobado' }));
      await setDoc(doc(c.firestore(), 'servicos/sa'), servico(ANA));
      await setDoc(doc(c.firestore(), 'servicos/sb'), servico(BETO));
    });
    await assertFails(getDoc(doc(db(), 'servicos/sa')));
    await assertSucceeds(getDoc(doc(db(), 'servicos/sb')));
    // consulta pública usada na publicação do site
    await assertSucceeds(getDocs(query(collection(db(), 'servicos'), where('perfilId', '==', BETO))));
    await assertFails(getDocs(query(collection(db(), 'servicos'), where('perfilId', '==', ANA))));
  });
});

describe('consentimentos e denúncias', () => {
  it('consentimento só se cria, nunca se altera', async () => {
    const ref = doc(db(ANA), 'consentimentos/c1');
    await assertSucceeds(setDoc(ref, { uid: ANA, versao: '2026-11', texto: 'acepto', criadoEm: 'x' }));
    await assertFails(updateDoc(ref, { versao: 'outra' }));
    await assertFails(setDoc(doc(db(ANA), 'consentimentos/c2'), { uid: BETO, versao: 'v', texto: 't', criadoEm: 'x' }));
  });
  it('qualquer pessoa denuncia; só o moderador lê', async () => {
    await assertSucceeds(setDoc(doc(db(), 'denuncias/d1'), { perfilId: ANA, motivo: 'spam', criadoEm: 'x' }));
    await assertFails(getDoc(doc(db(ANA), 'denuncias/d1')));
    await assertSucceeds(getDoc(doc(db(MOD), 'denuncias/d1')));
  });
  it('config só o moderador lê, ninguém escreve', async () => {
    await assertFails(getDoc(doc(db(ANA), 'config/moderadores')));
    await assertSucceeds(getDoc(doc(db(MOD), 'config/moderadores')));
    await assertFails(setDoc(doc(db(MOD), 'config/moderadores'), { uids: [ANA] }));
  });
});
