"""Gera as imagens de prévia (Open Graph, 1200x630 JPG) para WhatsApp e redes.

- public/og.jpg ............ portal (versionada)
- public/og/servicios-*.jpg  categorias (versionadas)
- public/og/<slug>.jpg ..... um por profissional (fora do git: dados reais)

Uso: python3 scripts/gerar-og.py
"""
import json, os, re
from PIL import Image, ImageDraw, ImageFilter, ImageFont

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(R, *a)
W, H = 1200, 630
GRAFITO, ESMERALDA, ESMERALDA_CLARO = (46, 48, 51), (31, 107, 78), (92, 196, 151)
F_TIT = P('public/fonts/plus-jakarta-sans-latin-700-normal.woff')
F_TXT = P('public/fonts/atkinson-hyperlegible-latin-700-normal.woff')

def fonte(caminho, tam):
    return ImageFont.truetype(caminho, tam)

def foto_fundo(src):
    """Foto cobrindo 1200x630, dessaturada e escurecida da esquerda para a direita."""
    if src and src.startswith('/'):
        cand = P('public', src.lstrip('/'))
        if os.path.exists(cand):
            im = Image.open(cand).convert('RGB')
            r = max(W / im.width, H / im.height)
            im = im.resize((int(im.width * r) + 1, int(im.height * r) + 1), Image.LANCZOS)
            x, y = (im.width - W) // 2, (im.height - H) // 2
            im = im.crop((x, y, x + W, y + H))
            cinza = im.convert('L').convert('RGB')
            im = Image.blend(im, cinza, 0.35)
            grad = Image.new('L', (W, 1))
            for i in range(W):
                grad.putpixel((i, 0), int(245 - 150 * (i / W)))
            grad = grad.resize((W, H))
            escuro = Image.new('RGB', (W, H), GRAFITO)
            return Image.composite(escuro, im, grad)
    return Image.new('RGB', (W, H), GRAFITO)

def texto_ajustado(d, txt, caminho, maximo, largura):
    t = maximo
    while t > 30 and d.textlength(txt, font=fonte(caminho, t)) > largura:
        t -= 2
    return fonte(caminho, t)

def compor(destino, foto, sobretitulo, titulo, rodape, ponto=True):
    im = foto_fundo(foto)
    d = ImageDraw.Draw(im)
    x = 80
    # sobretítulo com traço
    f_sob = fonte(F_TXT, 24)
    d.line([(x, 205), (x + 40, 205)], fill=(200, 200, 205), width=2)
    d.text((x + 56, 192), sobretitulo.upper(), font=f_sob, fill=(220, 220, 225))
    # título grande com ponto esmeralda
    f_tit = texto_ajustado(d, titulo + '.', F_TIT, 104, W - 2 * x)
    d.text((x, 240), titulo, font=f_tit, fill=(255, 255, 255))
    if ponto:
        d.text((x + d.textlength(titulo, font=f_tit) - f_tit.size * 0.04, 240), '.', font=f_tit, fill=ESMERALDA_CLARO)
    # rodapé
    d.text((x, H - 96), rodape, font=fonte(F_TXT, 28), fill=ESMERALDA_CLARO)
    # assinatura discreta
    f_ass = fonte(F_TIT, 26)
    marca = 'LoHagoYo'
    q = round(f_ass.size * 0.18)  # ponto quadrado do logo
    lx = W - 80 - d.textlength(marca, font=f_ass) - q - 3
    base = H - 66
    d.text((lx, base), 'LoHago', font=f_ass, fill=(255, 255, 255), anchor='ls')
    lx2 = lx + d.textlength('LoHago', font=f_ass)
    d.text((lx2, base), 'Yo', font=f_ass, fill=ESMERALDA_CLARO, anchor='ls')
    px = lx2 + d.textlength('Yo', font=f_ass) + 3
    d.rectangle((px, base - q, px + q - 1, base - 1), fill=ESMERALDA_CLARO)
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    im.save(destino, 'JPEG', quality=84, optimize=True, progressive=True)

# portal
compor(P('public/og.jpg'), '/img/servicios/general-1.webp', 'Santiago · Profesionales independientes',
       'Encuentra a quien lo hace', 'lohagoyo.cl')

# categorias (lidas da semilla)
sem = open(P('src/dados/semilla.ts'), encoding='utf-8').read()
for cid, nome, fid in re.findall(r"id: '([\w-]+)', nome: '([^']+)', foto: '([\w-]+)'", sem):
    compor(P(f'public/og/servicios-{cid}.jpg'), f'/img/servicios/{fid}.webp', 'Profesionales en Santiago',
           nome, f'lohagoyo.cl/servicios/{cid}')

# profissionais reais (data/perfis-locais.json, fora do git)
n = 0
for arq in [P('data/perfis-locais.json'), P('data/publicado.json')]:
    if not os.path.exists(arq):
        continue
    for p in json.load(open(arq, encoding='utf-8'))['perfis']:
        compor(P(f"public/og/{p['slug']}.jpg"), p.get('capa') or (p.get('fotos') or [None])[0],
               p['oficio'], p.get('marca') or p['nomePublico'], f"lohagoyo.cl/{p['slug']}")
        n += 1
print('og: portal + categorias +', n, 'perfis')
