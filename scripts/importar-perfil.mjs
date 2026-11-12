// Cadastro assistido: copia um perfil de data/perfis-locais.json para o Firestore real,
// já aprovado, usando a sessão do firebase-tools da conta dona do projeto (hola@lohagoyo.cl).
// Uso: node scripts/importar-perfil.mjs <slug> [--foto caminho.jpg] [--nome-completo "..."]
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');

const PROJETO = 'lohagoyo-prod';
const CONTA = 'hola@lohagoyo.cl';
const BUCKET = 'lohagoyo-prod.firebasestorage.app';
const DB = `projects/${PROJETO}/databases/(default)/documents`;

const args = process.argv.slice(2);
const slug = args[0];
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
if (!slug) throw new Error('uso: node scripts/importar-perfil.mjs <slug> [--foto arquivo.jpg] [--nome-completo "..."]');

const conta = auth.findAccountByEmail(CONTA);
if (!conta) throw new Error(`conta ${CONTA} não está logada no firebase-tools (npx firebase login:add)`);
const { access_token: token } = await auth.getAccessToken(conta.tokens.refresh_token, [
  'https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/firebase',
]);
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const local = JSON.parse(readFileSync('data/perfis-locais.json', 'utf8'));
const perfil = local.perfis.find((p) => p.slug === slug);
if (!perfil) throw new Error(`perfil ${slug} não encontrado em data/perfis-locais.json`);
const servicos = local.servicos.filter((s) => s.perfilId === perfil.id);

// --- Firestore REST ---
function val(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: campos(v) } };
}
const campos = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => [k, val(v)]));
const nomeDoc = (caminho) => `${DB}/${caminho}`;

const slugAtual = await fetch(`https://firestore.googleapis.com/v1/${nomeDoc(`slugs/${slug}`)}`, { headers: H });
if (slugAtual.ok) throw new Error(`o endereço ${slug} já está reservado no banco — nada foi feito`);

const agora = new Date().toISOString();
const uid = 'lhy' + randomBytes(14).toString('hex'); // dono provisório; vira a conta do profissional depois
const adminUid = JSON.parse((await (await fetch(`https://firestore.googleapis.com/v1/${nomeDoc('config/moderadores')}`, { headers: H })).text())).fields?.uids?.arrayValue?.values?.[0]?.stringValue ?? 'console';

// foto (opcional)
let retrato = '';
const foto = opt('--foto');
if (foto) {
  if (!existsSync(foto)) throw new Error(`foto não encontrada: ${foto}`);
  const nome = encodeURIComponent(`perfis/${uid}/retrato.jpg`);
  const up = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${nome}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg' }, body: readFileSync(foto),
  });
  if (!up.ok) throw new Error(`upload da foto falhou: ${up.status} ${await up.text()}`);
  const j = await up.json();
  retrato = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nome}?alt=media&token=${j.downloadTokens}`;
}

const { id: _idLocal, ...resto } = perfil;
const novoPerfil = {
  ...resto, id: uid, retrato: retrato || resto.retrato || '', status: 'aprobado',
  cartao: resto.cartao ?? { estrutura: 'editorial', tema: 'blanco' },
  aprovadoPor: adminUid, aprovadoEm: agora, criadoEm: resto.criadoEm ?? agora, atualizadoEm: agora,
};

const escritas = [
  { update: { name: nomeDoc(`slugs/${slug}`), fields: campos({ uid, criadoEm: agora }) }, currentDocument: { exists: false } },
  { update: { name: nomeDoc(`perfis/${uid}`), fields: campos(novoPerfil) } },
  { update: { name: nomeDoc(`profissionais/${uid}`), fields: campos({ nomeCompleto: opt('--nome-completo') ?? perfil.nomePublico, email: '', notas: 'Cadastro assistido (importado do perfil feito à mão).', criadoEm: agora, atualizadoEm: agora }) } },
  { update: { name: nomeDoc(`consentimentos/${uid}-assistido`), fields: campos({ uid, versao: '2026-11', texto: 'Cadastro assistido: o profissional enviou seus dados por WhatsApp pedindo a criação da página.', registradoPor: adminUid, criadoEm: agora }) } },
  ...servicos.map((s, i) => {
    const { id: _s, ...sv } = s;
    return { update: { name: nomeDoc(`servicos/${uid}-s${i + 1}`), fields: campos({ ...sv, perfilId: uid, atualizadoEm: agora }) } };
  }),
];

const r = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents:commit`, {
  method: 'POST', headers: H, body: JSON.stringify({ writes: escritas }),
});
if (!r.ok) throw new Error(`gravação falhou: ${r.status} ${await r.text()}`);
console.log(`importado: ${slug} -> perfis/${uid} (aprobado), ${servicos.length} serviços${retrato ? ', com foto' : ', SEM foto'}`);
console.log(`uid provisório do dono: ${uid}`);
