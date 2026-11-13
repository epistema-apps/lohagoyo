// Funções do LoHagoYo (região Santiago).
// - Publicação automática: quando muda o que está APROVADO (publicados) ou uma avaliação aprovada.
// - Avaliações: e-mail de confirmação para quem avalia; avisos ao profissional e à moderação.
// - Conversa privada: aviso por e-mail a cada nova mensagem.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import nodemailer from 'nodemailer';
import { montarEmail } from './email-layout.js';

initializeApp();
setGlobalOptions({ region: 'southamerica-west1', maxInstances: 2, memory: '256MiB' });

const GITHUB_TOKEN = defineSecret('GITHUB_TOKEN');
const SMTP_SENHA = defineSecret('SMTP_SENHA');
const REPO = 'epistema-apps/lohagoyo';
const SITE = 'https://lohagoyo.cl';
const REMETENTE = 'hola@lohagoyo.cl';
// Servidor SMTP da Cloudez: usar o nome do certificado dele (mail.lohagoyo.cl não está no certificado).
const db = () => getFirestore();

async function publicar(motivo) {
  const r = await fetch(`https://api.github.com/repos/${REPO}/dispatches`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN.value()}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lohagoyo-publicar' },
    body: JSON.stringify({ event_type: 'publicar', client_payload: { motivo } }),
  });
  if (!r.ok) logger.error('GitHub dispatch falhou', r.status, await r.text());
  else logger.info('publicação solicitada', motivo);
}

/** Envia e-mail com o layout da marca (HTML + texto). `msg` segue montarEmail(). */
async function email(para, assunto, msg) {
  if (!para) return logger.warn('sem destinatário para', assunto);
  const { html, text } = montarEmail(msg);
  const t = nodemailer.createTransport({ host: 'ip-45-79-0-64.cloudezapp.io', port: 465, secure: true, auth: { user: REMETENTE, pass: SMTP_SENHA.value() } });
  await t.sendMail({ from: `LoHagoYo <${REMETENTE}>`, to: para, subject: assunto, html, text });
  logger.info('e-mail enviado', assunto);
}

/** E-mail do profissional: o informado no cadastro ou o da conta de login. */
async function emailDoProfissional(uid) {
  const pr = await db().doc(`profissionais/${uid}`).get();
  if (pr.get('email')) return pr.get('email');
  try { return (await getAuth().getUser(uid)).email ?? ''; } catch { return ''; }
}
const nomeDoPerfil = async (uid) => {
  const p = await db().doc(`perfis/${uid}`).get();
  return { nome: p.get('marca') || p.get('nomePublico') || 'tu página', primeiro: String(p.get('nomePublico') || '').split(' ')[0], slug: p.get('slug') };
};

// ---------- publicação automática ----------

export const aoMudarPublicado = onDocumentWritten({ document: 'publicados/{id}', secrets: [GITHUB_TOKEN, SMTP_SENHA] }, async (ev) => {
  await publicar(`publicado ${ev.params.id}: ${ev.data?.after?.exists ? 'atualizado' : 'retirado'}`);
  // saiu da auditoria e voltou ao ar: avisa o profissional
  const antes = ev.data?.before?.data();
  const depois = ev.data?.after?.data();
  if (antes?.suspenso && depois && !depois.suspenso) {
    const { primeiro } = await nomeDoPerfil(ev.params.id);
    await email(await emailDoProfissional(ev.params.id), 'Tu página volvió a estar publicada',
      {
        titulo: 'Tu página está publicada de nuevo',
        texto: [`Hola ${primeiro}:`, 'La verificación de tu página terminó y ya está en línea otra vez.'],
        botao: { texto: 'Ver mi página', url: `${SITE}/${depois.perfil?.slug ?? ''}/` },
      });
  }
});

// ---------- avaliações ----------

export const aoMudarAvaliacao = onDocumentWritten(
  { document: 'avaliacoes/{id}', secrets: [GITHUB_TOKEN, SMTP_SENHA] },
  async (ev) => {
    const antes = ev.data?.before?.data();
    const depois = ev.data?.after?.data();
    const id = ev.params.id;

    // nova avaliação de visitante: pede confirmação do e-mail
    if (!antes && depois?.status === 'por_confirmar') {
      const pr = await db().doc(`avaliacoesPrivado/${id}`).get();
      const { nome } = await nomeDoPerfil(depois.perfilId);
      await email(pr.get('email'), `Confirma tu opinión sobre ${nome}`,
        {
          titulo: 'Confirma tu opinión',
          texto: [`Hola ${depois.nome}:`, `Gracias por tu opinión sobre **${nome}**. Para confirmarla y publicarla, toca el botón.`],
          botao: { texto: 'Confirmar mi opinión', url: `${SITE}/api/confirmar?id=${id}&t=${pr.get('token')}` },
          nota: 'Si no fuiste tú, ignora este correo.',
        });
    }

    // enviada ao profissional para conversar antes de publicar
    if (depois?.status === 'en_contestacion' && antes?.status !== 'en_contestacion') {
      const { primeiro } = await nomeDoPerfil(depois.perfilId);
      await email(await emailDoProfissional(depois.perfilId), 'Tienes una opinión pendiente en LoHagoYo',
        {
          titulo: 'Tienes una opinión pendiente',
          texto: [`Hola ${primeiro}:`, `Recibiste una opinión de un cliente (**${depois.nota} de 5**). Antes de que se publique, puedes responderla.`],
          botao: { texto: 'Ver y responder', url: `${SITE}/panel/` },
        });
    }

    // o que aparece no site mudou?
    const visivel = (a) => a?.status === 'aprobada';
    const mudouVisivel = visivel(antes) !== visivel(depois)
      || (visivel(depois) && ['nome', 'nota', 'texto', 'resposta'].some((k) => antes?.[k] !== depois?.[k]));
    if (mudouVisivel) await publicar(`avaliação ${id}`);

    // contou uma avaliação ruim confirmada? verifica o limite de bloqueio
    if (depois && CONTAM.includes(depois.status) && !CONTAM.includes(antes?.status)) {
      await verificarBloqueio(depois.perfilId);
    }
  },
);

// ---------- auditoria automática por avaliações negativas ----------
// Regra (publicada em /normas/): se entre as JANELA avaliações confirmadas mais recentes
// (só as recebidas desde a última auditoria, perfil.auditadoEm) houver LIMITE de nota <= NOTA_MA,
// a página sai do ar (fica uma página
// neutra "en verificación"), o profissional é avisado e o caso vai para a aba "Bloqueados".
// Ao "Desbloquear y publicar", auditadoEm = agora e a contagem recomeça.
const NOTA_MA = 2;
const LIMITE = 2;
const JANELA = 10;
const CONTAM = ['pendiente', 'en_contestacion', 'aprobada'];

async function verificarBloqueio(perfilId) {
  const ref = db().doc(`perfis/${perfilId}`);
  const p = await ref.get();
  if (!p.exists || p.get('status') === 'bloqueado') return;
  const desde = p.get('auditadoEm') ?? '';
  const s = await db().collection('avaliacoes').where('perfilId', '==', perfilId).get();
  const recentes = s.docs
    .filter((d) => CONTAM.includes(d.get('status')) && String(d.get('criadoEm') ?? '') > desde)
    .sort((a, b) => String(b.get('criadoEm')).localeCompare(String(a.get('criadoEm'))))
    .slice(0, JANELA);
  const mas = recentes.filter((d) => Number(d.get('nota')) <= NOTA_MA).length;
  if (mas < LIMITE) return;
  const agora = new Date().toISOString();
  const motivo = `${mas} de las últimas ${recentes.length} evaluaciones con ${NOTA_MA} estrellas o menos`;
  const pub = await db().doc(`publicados/${perfilId}`).get();
  const b = db().batch();
  b.update(ref, { status: 'bloqueado', bloqueadoEm: agora, motivoBloqueio: motivo, atualizadoEm: agora });
  // sai do ar: no lugar da página fica só um aviso neutro (sem dados pessoais)
  if (pub.exists) {
    b.set(db().doc(`publicados/${perfilId}`), {
      suspenso: true, suspensoEm: agora,
      perfil: { id: perfilId, slug: pub.get('perfil.slug') ?? p.get('slug'), marca: pub.get('perfil.marca') ?? p.get('marca') ?? '' },
    });
  }
  await b.commit();
  logger.warn('perfil em auditoria', perfilId, motivo);
  const { nome, primeiro } = await nomeDoPerfil(perfilId);
  await email(REMETENTE, `Auditoría automática: ${nome}`,
    {
      titulo: 'Auditoría automática',
      texto: [`**${nome}** salió del aire automáticamente (${motivo}).`, 'Decide en el panel, pestaña Profesionales > En auditoría.'],
      botao: { texto: 'Abrir auditoría', url: `${SITE}/panel/admin/` },
    });
  await email(await emailDoProfissional(perfilId), 'Tu página está en verificación',
    {
      titulo: 'Tu página está en verificación',
      texto: [
        `Hola ${primeiro}:`,
        `Entre las últimas opiniones de tu página hay **${mas} opiniones de ${NOTA_MA} estrellas o menos**. Según las Normas de calidad, quedó fuera del aire mientras se hace una revisión.`,
        'Puedes ver las opiniones y responderlas en tu panel. Recibirás un aviso cuando haya una decisión.',
      ],
      botao: { texto: 'Ver opiniones y responder', url: `${SITE}/panel/` },
      links: [{ texto: 'Leer las Normas de calidad', url: `${SITE}/normas/` }],
    });
}

// Link do e-mail: confirma a avaliação e ela é PUBLICADA na hora (regra: publicação automática;
// o controle é o bloqueio por avaliações ruins).
export const confirmarAvaliacao = onRequest(async (req, res) => {
  const id = String(req.query.id ?? '');
  const t = String(req.query.t ?? '');
  try {
    const [av, pr] = await Promise.all([db().doc(`avaliacoes/${id}`).get(), db().doc(`avaliacoesPrivado/${id}`).get()]);
    if (!av.exists || !pr.exists || !t || pr.get('token') !== t) return res.redirect(302, `${SITE}/opinion/?estado=invalido`);
    if (av.get('status') === 'por_confirmar') await av.ref.update({ status: 'aprobada' });
    return res.redirect(302, `${SITE}/opinion/?estado=confirmada`);
  } catch (e) {
    logger.error(e);
    return res.redirect(302, `${SITE}/opinion/?estado=erro`);
  }
});

// ---------- conversa privada ----------

export const aoNovaMensagem = onDocumentCreated(
  { document: 'avaliacoes/{id}/mensagens/{msg}', secrets: [SMTP_SENHA] },
  async (ev) => {
    const m = ev.data?.data();
    const av = await db().doc(`avaliacoes/${ev.params.id}`).get();
    if (!m || !av.exists) return;
    const { nome, primeiro } = await nomeDoPerfil(av.get('perfilId'));
    if (m.autor === 'admin') {
      await email(await emailDoProfissional(av.get('perfilId')), 'Nuevo mensaje en tu panel de LoHagoYo',
        {
          titulo: 'Tienes un nuevo mensaje',
          texto: [`Hola ${primeiro}:`, 'Hay un nuevo mensaje sobre una opinión de un cliente:'],
          citacao: m.texto,
          botao: { texto: 'Responder en mi panel', url: `${SITE}/panel/` },
        });
    } else {
      await email(REMETENTE, `Respuesta de ${nome} sobre una opinión`,
        {
          titulo: `Respuesta de ${nome}`,
          texto: [`**${nome}** respondió sobre una opinión:`],
          citacao: m.texto,
          botao: { texto: 'Ver en el panel', url: `${SITE}/panel/admin/` },
        });
    }
  },
);
