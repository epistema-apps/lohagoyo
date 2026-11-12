// Sugestão de código postal (Chile) a partir do endereço, via OpenStreetMap (Nominatim).
// É só sugestão: o OSM às vezes devolve um código genérico da cidade (terminado em 0000), que descartamos.
import type { Endereco } from '../dominio/tipos';

export const LINK_CORREOS = 'https://www.correos.cl/codigo-postal';

export async function sugerirCodigoPostal(e: Endereco): Promise<string | null> {
  if (!e.calle?.trim() || !e.numero?.trim() || !e.comuna?.trim()) return null;
  const q = new URLSearchParams({
    street: `${e.numero.trim()} ${e.calle.trim()}`, city: e.comuna.trim(), country: 'Chile',
    format: 'jsonv2', addressdetails: '1', limit: '1',
  });
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, { headers: { 'Accept-Language': 'es' } });
    if (!r.ok) return null;
    const d = (await r.json()) as { address?: { postcode?: string } }[];
    const cp = d[0]?.address?.postcode?.replace(/\D/g, '') ?? '';
    return /^\d{7}$/.test(cp) && !cp.endsWith('0000') ? cp : null;
  } catch {
    return null;
  }
}
