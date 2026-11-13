// Contato público da plataforma (usado em "Ofrece tu servicio" e privacidade).
// whatsapp: só números com código do país (ex.: '56912345678'); vazio = usa e-mail.
// Liga o cadastro pelo painel (/panel/) no site. Só ativar depois de Auth/Firestore/Storage no console.
export const PAINEL_ATIVO = true;

export const CONTATO = {
  whatsapp: '',
  email: 'hola@lohagoyo.cl',
};

export function linkCadastro(): string {
  const msg = 'Hola, quiero crear mi página gratis en LoHagoYo. Ofrezco el servicio de: ';
  return CONTATO.whatsapp
    ? `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(msg)}`
    : `mailto:${CONTATO.email}?subject=${encodeURIComponent('Quiero mi página en LoHagoYo')}&body=${encodeURIComponent(msg)}`;
}
