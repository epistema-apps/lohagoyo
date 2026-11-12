// Busca no Firestore os perfis APROVADOS e seus serviços (leitura pública, sem credenciais)
// e grava em data/publicado.json, usado pelo build. As fotos enviadas pelos profissionais
// são baixadas para public/f/<uid>/ e servidas pelo próprio Hosting.
// Uso: node scripts/sincronizar.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJETO = 'lohagoyo-prod';
// LHY_EMULADOR=1 lê do emulador local (testes).
const EMU = process.env.LHY_EMULADOR === '1';
const API = EMU
  ? 'http://127.0.0.1:8080/v1/projects/demo-lohagoyo/databases/(default)/documents'
  : `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

function valor(v) {
  if (!v) return undefined;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(valor);
  if ('mapValue' in v) return objeto(v.mapValue.fields ?? {});
  return undefined;
}
const objeto = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, valor(v)]));

async function consulta(colecao, campo, igual) {
  const r = await fetch(`${API}:runQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: colecao }],
        where: { fieldFilter: { field: { fieldPath: campo }, op: 'EQUAL', value: { stringValue: igual } } },
      },
    }),
  });
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const linhas = await r.json();
  return linhas.filter((l) => l.document).map((l) => ({ ...objeto(l.document.fields ?? {}), _id: l.document.name.split('/').pop() }));
}

async function baixarFoto(url, uid, nome) {
  if (!url || !/^(https:\/\/firebasestorage\.googleapis\.com|http:\/\/127\.0\.0\.1:9199)\//.test(url)) return url; // banco ou vazio
  const r = await fetch(url);
  if (!r.ok) return '';
  const dir = join(RAIZ, 'public', 'f', uid);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${nome}.jpg`), Buffer.from(await r.arrayBuffer()));
  return `/f/${uid}/${nome}.jpg`;
}

// Lista todos os documentos de uma coleção (leitura pública), com paginação.
async function listar(colecao) {
  const out = [];
  let pagina = '';
  do {
    const r = await fetch(`${API}/${colecao}?pageSize=300${pagina ? `&pageToken=${pagina}` : ''}`);
    if (!r.ok) throw new Error(`Firestore ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    out.push(...(j.documents ?? []).map((d) => ({ ...objeto(d.fields ?? {}), _id: d.name.split('/').pop() })));
    pagina = j.nextPageToken ?? '';
  } while (pagina);
  return out;
}

// CURADORIA: só o que o administrador aprovou (coleção publicados) vai ao site.
let perfis = [];
let servicos = [];
let avaliacoes = [];
try {
  const publicados = await listar('publicados');
  for (const pub of publicados) {
    const p = { ...pub.perfil, status: 'aprobado' };
    p.retrato = await baixarFoto(p.retrato, p.id, 'retrato');
    p.capa = await baixarFoto(p.capa, p.id, 'capa');
    p.fotos = await Promise.all((p.fotos ?? []).map((f, i) => baixarFoto(f, p.id, `trabajo-${i + 1}`)));
    perfis.push(p);
    servicos.push(...(pub.servicos ?? []).map((sv) => ({ ...sv, perfilId: p.id, ativo: sv.ativo !== false })));
  }
  const ids = new Set(perfis.map((p) => p.id));
  avaliacoes = (await consulta('avaliacoes', 'status', 'aprobada'))
    .filter((a) => ids.has(a.perfilId))
    // Público: só o primeiro nome de quem avaliou, a nota e o comentário (e a resposta do profissional).
    .map(({ _id, nome, nota, texto, resposta, perfilId, criadoEm }) => ({
      id: _id, perfilId, nome: String(nome ?? '').trim().split(/\s+/)[0], nota, texto, resposta, status: 'aprobada', criadoEm,
    }));
} catch (e) {
  console.warn('sincronizar: Firestore indisponível —', e.message, '(seguindo só com dados locais)');
}

mkdirSync(join(RAIZ, 'data'), { recursive: true });
writeFileSync(join(RAIZ, 'data', 'publicado.json'), JSON.stringify({ perfis, servicos, avaliacoes }, null, 2));
console.log(`sincronizar: ${perfis.length} perfis publicados, ${servicos.length} serviços, ${avaliacoes.length} avaliações`);
