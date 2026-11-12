// Coloca/troca a foto pessoal (retrato) de um perfil já existente no Firestore (cadastro assistido).
// Uso: node scripts/subir-retrato.mjs <slug> <arquivo.jpg>
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const PROJETO = 'lohagoyo-prod';
const BUCKET = 'lohagoyo-prod.firebasestorage.app';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

const [slug, arquivo] = process.argv.slice(2);
if (!slug || !arquivo || !existsSync(arquivo)) throw new Error('uso: node scripts/subir-retrato.mjs <slug> <arquivo.jpg>');

const conta = auth.findAccountByEmail('hola@lohagoyo.cl');
const { access_token: token } = await auth.getAccessToken(conta.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const H = { Authorization: `Bearer ${token}` };

const s = await fetch(`${DOCS}/slugs/${slug}`, { headers: H });
if (!s.ok) throw new Error(`endereço ${slug} não existe no banco`);
const uid = (await s.json()).fields.uid.stringValue;

const nome = encodeURIComponent(`perfis/${uid}/retrato.jpg`);
const up = await fetch(`https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${nome}`, {
  method: 'POST', headers: { ...H, 'Content-Type': 'image/jpeg' }, body: readFileSync(arquivo),
});
if (!up.ok) throw new Error(`upload falhou: ${up.status} ${await up.text()}`);
const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${nome}?alt=media&token=${(await up.json()).downloadTokens}`;

const r = await fetch(`${DOCS}/perfis/${uid}?updateMask.fieldPaths=retrato&updateMask.fieldPaths=atualizadoEm`, {
  method: 'PATCH', headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { retrato: { stringValue: url }, atualizadoEm: { stringValue: new Date().toISOString() } } }),
});
if (!r.ok) throw new Error(`atualização falhou: ${r.status} ${await r.text()}`);
console.log(`foto atualizada: ${slug} (${uid}). Rode npm run publicar para ir ao ar.`);
