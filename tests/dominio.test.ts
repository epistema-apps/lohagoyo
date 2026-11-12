import { describe, expect, it } from 'vitest';
import { linkWhatsApp, normalizar, textoMateriais, textoPreco } from '../src/dominio/formato';
import { gerarSlug, slugValido } from '../src/dominio/slug';
import { adaptadorLocal } from '../src/dados/adaptador-local';

const nbsp = (s: string) => s.replace(/\s/g, ' ');

describe('preço', () => {
  it('a cotizar quando oculto ou sem valor', () => {
    expect(textoPreco({ tipo: 'fijo', valor: 1000, mostrar: false })).toBe('A cotizar');
    expect(textoPreco({ tipo: 'a_cotizar', mostrar: true })).toBe('A cotizar');
    expect(textoPreco({ tipo: 'por_hora', mostrar: true })).toBe('A cotizar');
  });
  it('formata CLP por tipo', () => {
    expect(nbsp(textoPreco({ tipo: 'desde', valor: 15000, mostrar: true }))).toBe('Desde $15.000');
    expect(nbsp(textoPreco({ tipo: 'por_visita', valor: 25000, mostrar: true }))).toBe('$25.000 por visita');
    expect(nbsp(textoPreco({ tipo: 'mensual', valor: 80000, mostrar: true }))).toBe('$80.000 al mes');
  });
  it('não mostra valores de materiais quando preço oculto', () => {
    expect(textoMateriais({ tipo: 'por_hora', valor: 1, maoDeObra: 5, materiais: 'estimado', materiaisEstimado: 9, mostrar: false }))
      .toBe('Materiales según trabajo');
  });
});

describe('whatsapp', () => {
  it('gera link com mensagem e primeiro nome', () => {
    const l = linkWhatsApp({ whatsapp: '56900000000' }, 'Pedro Ejemplo', 'Corte de pasto')!;
    expect(l.startsWith('https://wa.me/56900000000?text=')).toBe(true);
    expect(decodeURIComponent(l.split('text=')[1])).toContain('Hola Pedro');
  });
  it('null sem whatsapp', () => expect(linkWhatsApp({}, 'X')).toBeNull());
});

describe('slug', () => {
  it('gera sem acento', () => expect(gerarSlug('Manú Piscinas Ñuñoa')).toBe('manu-piscinas-nunoa'));
  it('bloqueia reservados e inválidos', () => {
    expect(slugValido('servicios')).toBe(false);
    expect(slugValido('panel')).toBe(false);
    expect(slugValido('-x')).toBe(false);
    expect(slugValido('ab--c')).toBe(false);
    expect(slugValido('manu-piscinas')).toBe(true);
  });
  it('busca ignora acentos', () => expect(normalizar('Jardinería')).toBe('jardineria'));
});

describe('dados (adaptador local)', () => {
  it('só publica perfis aprovados', async () => {
    const perfis = await adaptadorLocal.listarPerfisPublicos();
    expect(perfis.every((p) => p.status === 'aprobado')).toBe(true);
    expect(await adaptadorLocal.buscarPerfilPorSlug('perfil-pendiente')).toBeNull();
  });
  it('slugs da semilla são válidos e únicos', async () => {
    const slugs = (await adaptadorLocal.listarPerfisPublicos()).map((p) => p.slug);
    expect(slugs.every(slugValido)).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('tarjeta', () => {
  it('gera PDF em todas as estruturas e cores, e a folha A4', async () => {
    const { readFileSync } = await import('node:fs');
    const { gerarPdfCartao } = await import('../src/components/cartao/gerarPdf');
    const { ESTRUTURAS } = await import('../src/components/cartao/desenho');
    const { TEMAS } = await import('../src/components/cartao/temas');
    const carregar = async (c: string) => readFileSync('public' + c);
    const d = { nome: 'Pedro Ejemplo Muñoz', oficio: 'Mantención de piscinas', telefone: '+56 9 0000 0000', email: 'pedro@ejemplo.cl', comunas: 'Ñuñoa · La Reina', url: 'https://lohagoyo.cl/pedro/', urlCurta: 'lohagoyo.cl/pedro' };
    for (const e of ESTRUTURAS) for (const t of Object.keys(TEMAS)) {
      const pdf = await gerarPdfCartao(d, e.id, t as never, 'imprenta', carregar);
      expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe('%PDF-');
    }
    const a4 = await gerarPdfCartao(d, 'punto', 'blanco', 'a4', carregar);
    expect(a4.length).toBeGreaterThan(1000);
  });
});
