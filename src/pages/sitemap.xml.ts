import type { APIRoute } from 'astro';
import { dados } from '../dados';

export const GET: APIRoute = async ({ site }) => {
  const base = site!.href.replace(/\/$/, '');
  const categorias = await dados.listarCategorias();
  const perfis = await dados.listarPerfisPublicos();
  const urls = [
    { loc: `${base}/`, lastmod: undefined as string | undefined },
    { loc: `${base}/sumate/`, lastmod: undefined },
    ...categorias.map((c) => ({ loc: `${base}/servicios/${c.id}/`, lastmod: undefined })),
    ...perfis.map((p) => ({ loc: `${base}/${p.slug}/`, lastmod: p.atualizadoEm.slice(0, 10) })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
