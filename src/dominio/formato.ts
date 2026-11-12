// Formatação para a interface (espanhol do Chile). Sem dependência do banco.
import type { Contatos, Preco, Publico } from './tipos';

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export function formatarCLP(v: number): string {
  return clp.format(v);
}

const sufixo: Record<string, string> = {
  fijo: '',
  desde: '',
  por_visita: ' por visita',
  por_hora: ' por hora',
  por_m2: ' por m²',
  mensual: ' al mes',
};

/** Texto principal do preço. Retorna 'A cotizar' se oculto ou sem valor. */
export function textoPreco(p: Preco): string {
  if (!p.mostrar || p.tipo === 'a_cotizar' || p.valor == null) return 'A cotizar';
  const v = formatarCLP(p.valor);
  return p.tipo === 'desde' ? `Desde ${v}` : `${v}${sufixo[p.tipo] ?? ''}`;
}

/** Linha sobre materiais / mão de obra. */
export function textoMateriais(p: Preco): string | null {
  const partes: string[] = [];
  if (p.mostrar && p.maoDeObra != null && p.tipo !== 'a_cotizar') partes.push(`Mano de obra ${formatarCLP(p.maoDeObra)}`);
  if (p.materiais === 'incluidos') partes.push('Insumos incluidos');
  if (p.materiais === 'aparte') partes.push('Materiales aparte');
  if (p.materiais === 'estimado')
    partes.push(
      p.mostrar && p.materiaisEstimado != null
        ? `Materiales aprox. ${formatarCLP(p.materiaisEstimado)}`
        : 'Materiales según trabajo',
    );
  return partes.length ? partes.join(' · ') : null;
}

const nomesPublico: Record<Publico, string> = {
  casas: 'Casas',
  edificios: 'Edificios y condominios',
  empresas: 'Empresas',
};
export const textoPublico = (p: Publico) => nomesPublico[p];

/** Link wa.me com mensagem pronta. */
export function linkWhatsApp(c: Contatos, nome: string, servico?: string): string | null {
  if (!c.whatsapp) return null;
  const primeiro = nome.split(' ')[0];
  const msg = servico
    ? `Hola ${primeiro}, vi tu perfil en Lo Hago Yo y quiero cotizar: ${servico}.`
    : `Hola ${primeiro}, vi tu perfil en Lo Hago Yo y quiero hacerte una consulta.`;
  return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(msg)}`;
}

/** Normaliza para busca sem acento. */
export function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
