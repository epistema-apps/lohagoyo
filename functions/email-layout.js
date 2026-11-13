// Layout HTML dos e-mails do LoHagoYo: cabeçalho grafite com o logo, corpo branco,
// links como botões e rodapé discreto. Tabelas + estilos inline (compatível com Gmail/Outlook).
// Sempre acompanha uma versão em texto simples.

const SITE = 'https://lohagoyo.cl';
const LOGO = `${SITE}/marca/logo-email.png`;

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * @param {object} m
 * @param {string} m.titulo       Título grande do e-mail.
 * @param {string[]} [m.texto]    Parágrafos (texto simples; **negrito** permitido).
 * @param {string} [m.citacao]    Texto citado (mensagem de alguém), em destaque.
 * @param {{texto:string,url:string}} [m.botao]  Botão principal.
 * @param {{texto:string,url:string}[]} [m.links] Links secundários (aparecem como botões contornados).
 * @param {string} [m.nota]       Nota pequena no fim (ex.: "Si no fuiste tú, ignora este correo.").
 * @returns {{html:string, text:string}}
 */
export function montarEmail(m) {
  const par = (p) => esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const fonte = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";
  const botao = (b, primario) => `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr>
      <td style="border-radius:10px;background:${primario ? '#1F6B4E' : '#FFFFFF'};${primario ? '' : 'border:1.5px solid #1F6B4E;'}">
        <a href="${esc(b.url)}" target="_blank" style="display:inline-block;padding:14px 26px;${fonte};font-size:16px;font-weight:700;color:${primario ? '#FFFFFF' : '#1F6B4E'};text-decoration:none;border-radius:10px">${esc(b.texto)}</a>
      </td></tr></table>`;

  const corpo = [
    `<h1 style="margin:0 0 18px;${fonte};font-size:24px;line-height:1.25;color:#1A1918;letter-spacing:-0.3px">${esc(m.titulo)}<span style="color:#2F9A6E">.</span></h1>`,
    ...(m.texto ?? []).map((p) => `<p style="margin:0 0 14px;${fonte};font-size:16px;line-height:1.55;color:#3A3C40">${par(p)}</p>`),
    m.citacao
      ? `<div style="margin:6px 0 18px;padding:14px 18px;border-left:4px solid #5CC497;background:#E2F2EA;border-radius:8px;${fonte};font-size:16px;line-height:1.55;color:#14422F;white-space:pre-line">${esc(m.citacao)}</div>`
      : '',
    m.botao ? botao(m.botao, true) : '',
    ...(m.links ?? []).map((l) => botao(l, false)),
    m.nota ? `<p style="margin:18px 0 0;${fonte};font-size:13px;line-height:1.5;color:#8A857E">${par(m.nota)}</p>` : '',
  ].join('\n');

  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(m.titulo)}</title></head>
<body style="margin:0;padding:0;background:#F4F3F0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F3F0"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;overflow:hidden;border:1px solid #E4E2DD">
    <tr><td style="background:#2E3033;padding:22px 28px">
      <a href="${SITE}" target="_blank"><img src="${LOGO}" width="156" height="35" alt="LoHagoYo" style="display:block;border:0;width:156px;height:auto"></a>
    </td></tr>
    <tr><td style="padding:30px 28px 28px">${corpo}</td></tr>
    <tr><td style="padding:18px 28px;border-top:1px solid #ECEAE5;${fonte};font-size:12px;line-height:1.5;color:#9A9C9F">
      LoHagoYo · Plataforma gratuita para profesionales independientes · <a href="${SITE}" style="color:#1F6B4E;text-decoration:none">lohagoyo.cl</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `${m.titulo}.`,
    ...(m.texto ?? []).map((p) => p.replace(/\*\*(.+?)\*\*/g, '$1')),
    m.citacao ? `"${m.citacao}"` : '',
    m.botao ? `${m.botao.texto}: ${m.botao.url}` : '',
    ...(m.links ?? []).map((l) => `${l.texto}: ${l.url}`),
    m.nota ?? '',
    `—\nLoHagoYo · ${SITE}`,
  ].filter(Boolean).join('\n\n');

  return { html, text };
}
