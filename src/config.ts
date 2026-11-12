// Contato público da plataforma (usado em "Ofrece tu servicio" e privacidade).
// whatsapp: só números com código do país (ex.: '56912345678'); vazio = usa e-mail.
export const CONTATO = {
  whatsapp: '',
  email: 'hola@lohagoyo.cl',
};

export function linkCadastro(): string {
  const msg = 'Hola, quiero crear mi página gratis en LoHagoYo.cl. Ofrezco el servicio de: ';
  return CONTATO.whatsapp
    ? `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(msg)}`
    : `mailto:${CONTATO.email}?subject=${encodeURIComponent('Quiero mi página en LoHagoYo.cl')}&body=${encodeURIComponent(msg)}`;
}
