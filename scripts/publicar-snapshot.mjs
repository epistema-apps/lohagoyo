// Cria/atualiza a versão publicada (publicados/{uid}) a partir da cópia de trabalho atual,
// como o botão "Aprobar y publicar" do admin. Uso: node scripts/publicar-snapshot.mjs <slug>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const auth = require('firebase-tools/lib/auth');
const DOCS = 'https://firestore.googleapis.com/v1/projects/lohagoyo-prod/databases/(default)/documents';
const slug = process.argv[2];
if (!slug) throw new Error('uso: node scripts/publicar-snapshot.mjs <slug>');
const conta = auth.findAccountByEmail('hola@lohagoyo.cl');
const { access_token: tk } = await auth.getAccessToken(conta.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
const H = { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' };
const uid = (await (await fetch(`${DOCS}/slugs/${slug}`, { headers: H })).json()).fields.uid.stringValue;
const perfil = await (await fetch(`${DOCS}/perfis/${uid}`, { headers: H })).json();
const q = await (await fetch(`${DOCS}:runQuery`, { method: 'POST', headers: H, body: JSON.stringify({ structuredQuery: {
  from: [{ collectionId: 'servicos' }], where: { fieldFilter: { field: { fieldPath: 'perfilId' }, op: 'EQUAL', value: { stringValue: uid } } } } }) })).json();
const servicos = q.filter((l) => l.document).map((l) => ({ mapValue: { fields: { ...l.document.fields, id: { stringValue: l.document.name.split('/').pop() } } } }));
const agora = new Date().toISOString();
const r = await fetch(`${DOCS}/publicados/${uid}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields: {
  perfil: { mapValue: { fields: { ...perfil.fields, status: { stringValue: 'aprobado' } } } },
  servicos: { arrayValue: { values: servicos } },
  publicadoEm: { stringValue: agora }, publicadoPor: { stringValue: 'console' },
} }) });
if (!r.ok) throw new Error(`falhou: ${r.status} ${await r.text()}`);
console.log(`publicado: ${slug} (${uid}) com ${servicos.length} serviços`);
