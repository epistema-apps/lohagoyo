// Publicação automática: quando um perfil aprovado (ou seus serviços) muda,
// avisa o GitHub Actions para reconstruir e publicar o site.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger, setGlobalOptions } from 'firebase-functions/v2';

initializeApp();
setGlobalOptions({ region: 'southamerica-west1', maxInstances: 2, memory: '256MiB' });

const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');
const REPO = 'epistema-apps/lohagoyo';

async function publicar(motivo) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN.value()}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'lohagoyo-publicar',
    },
    body: JSON.stringify({ event_type: 'publicar', client_payload: { motivo } }),
  });
  if (!r.ok) logger.error('GitHub dispatch falhou', r.status, await r.text());
  else logger.info('publicação solicitada', motivo);
}

const opcoes = { secrets: [GITHUB_TOKEN], database: '(default)' };

// Perfil: publica se estava ou ficou aprovado (aprovação, edição, pausa ou exclusão).
export const aoMudarPerfil = onDocumentWritten({ ...opcoes, document: 'perfis/{id}' }, async (ev) => {
  const antes = ev.data?.before?.data();
  const depois = ev.data?.after?.data();
  if (antes?.status !== 'aprobado' && depois?.status !== 'aprobado') return;
  await publicar(`perfil ${ev.params.id}: ${antes?.status ?? '—'} -> ${depois?.status ?? 'apagado'}`);
});

// Serviço: publica se o perfil dono está aprovado.
export const aoMudarServico = onDocumentWritten({ ...opcoes, document: 'servicos/{id}' }, async (ev) => {
  const perfilId = ev.data?.after?.data()?.perfilId ?? ev.data?.before?.data()?.perfilId;
  if (!perfilId) return;
  const p = await getFirestore().doc(`perfis/${perfilId}`).get();
  if (p.get('status') !== 'aprobado') return;
  await publicar(`serviço ${ev.params.id} do perfil ${perfilId}`);
});
