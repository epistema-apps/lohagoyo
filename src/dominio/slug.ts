// Slugs de perfil: lohagoyo.cl/<slug>/
import { normalizar } from './formato';

/** Rotas do site que nenhum perfil pode usar. */
export const SLUGS_RESERVADOS = new Set([
  'servicios', 'sumate', 'privacidad', 'terminos', 'panel', 'admin', 'api', 'buscar',
  'apoyo', 'dalepega', 'ayuda', 'contacto', 'sitemap', 'robots', '404', '_astro', 'demo', 'normas', 'en-verificacion', 'opinion',
  'creditos', 'tarjeta', 'marca', 'fonts', 'og', 'f',
]);

export function gerarSlug(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export function slugValido(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug) && !slug.includes('--') && !SLUGS_RESERVADOS.has(slug);
}
