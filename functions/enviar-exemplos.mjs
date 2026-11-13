// Envia um exemplo de cada e-mail (dados fictícios) para revisar o layout.
// Uso: SMTP_SENHA=... node functions/enviar-exemplos.mjs destino@exemplo.com
import nodemailer from 'nodemailer';
import { montarEmail } from './email-layout.js';

const para = process.argv[2];
const SITE = 'https://lohagoyo.cl';
if (!para || !process.env.SMTP_SENHA) throw new Error('uso: SMTP_SENHA=... node enviar-exemplos.mjs destino');

const exemplos = [
  ['Confirma tu opinión sobre Pedro Gasfiter', {
    titulo: 'Confirma tu opinión',
    texto: ['Hola Camila:', 'Gracias por tu opinión sobre **Pedro Gasfiter**. Para confirmarla y publicarla, toca el botón.'],
    botao: { texto: 'Confirmar mi opinión', url: `${SITE}/opinion/` },
    nota: 'Si no fuiste tú, ignora este correo.',
  }],
  ['Tienes una opinión pendiente en LoHagoYo', {
    titulo: 'Tienes una opinión pendiente',
    texto: ['Hola Pedro:', 'Recibiste una opinión de un cliente (**2 de 5**). Antes de que se publique, puedes responderla.'],
    botao: { texto: 'Ver y responder', url: `${SITE}/panel/` },
  }],
  ['Nuevo mensaje en tu panel de LoHagoYo', {
    titulo: 'Tienes un nuevo mensaje',
    texto: ['Hola Pedro:', 'Hay un nuevo mensaje sobre una opinión de un cliente:'],
    citacao: 'El cliente dice que el trabajo quedó a medias. ¿Puedes contar tu versión?',
    botao: { texto: 'Responder en mi panel', url: `${SITE}/panel/` },
  }],
  ['Tu página está en verificación', {
    titulo: 'Tu página está en verificación',
    texto: [
      'Hola Pedro:',
      'Entre las últimas opiniones de tu página hay **2 opiniones de 2 estrellas o menos**. Según las Normas de calidad, quedó fuera del aire mientras se hace una revisión.',
      'Puedes ver las opiniones y responderlas en tu panel. Recibirás un aviso cuando haya una decisión.',
    ],
    botao: { texto: 'Ver opiniones y responder', url: `${SITE}/panel/` },
    links: [{ texto: 'Leer las Normas de calidad', url: `${SITE}/normas/` }],
  }],
  ['Tu página volvió a estar publicada', {
    titulo: 'Tu página está publicada de nuevo',
    texto: ['Hola Pedro:', 'La verificación de tu página terminó y ya está en línea otra vez.'],
    botao: { texto: 'Ver mi página', url: SITE },
  }],
  ['[Admin] Auditoría automática: Pedro Gasfiter', {
    titulo: 'Auditoría automática',
    texto: ['**Pedro Gasfiter** salió del aire automáticamente (2 de las últimas 10 evaluaciones con 2 estrellas o menos).', 'Decide en el panel, pestaña Profesionales > En auditoría.'],
    botao: { texto: 'Abrir auditoría', url: `${SITE}/panel/admin/` },
  }],
  ['[Admin] Respuesta de Pedro Gasfiter sobre una opinión', {
    titulo: 'Respuesta de Pedro Gasfiter',
    texto: ['**Pedro Gasfiter** respondió sobre una opinión:'],
    citacao: 'Terminé el trabajo el mismo día; el cliente pidió un cambio de llave que no estaba en la cotización.',
    botao: { texto: 'Ver en el panel', url: `${SITE}/panel/admin/` },
  }],
];

const t = nodemailer.createTransport({ host: 'ip-45-79-0-64.cloudezapp.io', port: 465, secure: true, auth: { user: 'hola@lohagoyo.cl', pass: process.env.SMTP_SENHA } });
for (const [assunto, m] of exemplos) {
  const { html, text } = montarEmail(m);
  await t.sendMail({ from: 'LoHagoYo <hola@lohagoyo.cl>', to: para, subject: `[Ejemplo] ${assunto}`, html, text });
  console.log('enviado:', assunto);
}
