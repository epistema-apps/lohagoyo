# Estado atual — Lo Hago Yo

Atualizado em 12/11/2026 · versão 0.1.0 · **Fase 1 concluída (com dados fictícios)**

## Pronto
- Projeto Astro 7 + React 19 + TypeScript (`~/Epistema/lohagoyo`), Node portátil 24.
- Decisões registradas em `docs/DECISOES.md`.
- Tipos do domínio (`src/dominio/`), contrato de dados e adaptador local com semilla fictícia (`src/dados/`).
- Páginas públicas estáticas: home do portal com busca (sem acento) e filtro por comuna; `/servicios/<categoria>/`; `/sumate/`; `/privacidad/` (rascunho); 404; `sitemap.xml`; `robots.txt`.
- **Site próprio de cada profissional** em `/<slug>/` (modelo único, foco em qualidade): visual editorial claro inspirado nas referências — cabeçalho com a marca + ponto, título grande, colagem de fotos com cantos arredondados e selo "Atiendo", faixa de dados (serviços, zona, público, boleta), serviços numerados (01, 02…) com incluye/frecuencia/adicionales e preço, galeria, sobre mim, contato em bloco escuro; LoHagoYo.cl só no rodapé. Sem fotos próprias, usa as da categoria.
- **Home do portal**: busca (serviço + comuna, sugestões, sinônimos), categorias com foto, resultados, cómo funciona, chamada para profissionais. 23 fotos livres do Unsplash (`public/img/servicios/`, créditos em `/creditos/`).
- SEO: canonical, Open Graph, JSON-LD (`WebSite`, `BreadcrumbList`, `LocalBusiness` com catálogo de serviços).
- Serviços com preço opcional (7 tipos), mão de obra × materiais, temporadas, extras, botão "Cotizar por WhatsApp" com mensagem pronta.
- **Tarjeta de presentación em PDF** no estilo editorial do site: marca do profissional com ponto ocre, nome da pessoa, sobretítulo com traço, logo LoHagoYo.cl discreto. **4 estruturas** (Editorial, Dividida, Franja, Punto) × **4 cores** (Blanco, Piedra, Grafito, Pizarra). QR vetorial, fontes embutidas; 9 × 5 cm com sangria 3 mm e marcas de corte, ou A4 com 10. Tela em `/tarjeta/<slug>/` (noindex): prévia grande, miniaturas, cores e download.
- **Marca LoHagoYo.cl**: logo em curvas, Plus Jakarta Sans 600, `LoHago` grafito + `Yo` ocre + ponto ocre + `cl` pequeno (`public/marca/logo.svg`, `logo-negativo.svg`, `icone.svg` "Yo."). **Paleta sóbria:** grafito `#15171C`, piedra `#F4F3F0`, branco, acento ocre `#9C7636`. Títulos em Plus Jakarta Sans, texto em Atkinson Hyperlegible, fontes servidas pelo próprio site. Gerador: `node docs/marca/gerar-logo.mjs`.
- Rascunho de `firestore.rules` e `storage.rules`, `firebase.json` (Hosting + emuladores).
- Testes: `npm test` (11 passando). Build: 11 páginas.

## Publicação (Firebase Hosting, plano grátis)
- `npm run publicar` = gera imagens de prévia (`scripts/gerar-og.py`) + build de produção + `firebase deploy --only hosting --project lohagoyo-prod`.
- Produção publica **só perfis reais** (`data/perfis-locais.json`, fora do git); fictícios só em dev ou com `LHY_DEMO=1`.
- Publicado a partir do Mac (os dados reais não vão para o git).
- Contato público da plataforma em `src/config.ts`.

## Comandos
```
export PATH=~/.local/node-v24.22.2-darwin-arm64/bin:$PATH
npm run dev     # http://localhost:4321
npm test
npm run build
```

## Teste local com perfil real
- `data/perfis-locais.json` e `public/locais/` (fora do git) — hoje com o Manuel (`/manu-piscinas/`), usando fotos de referência. Falta WhatsApp e comunas dele.

## Pendências do responsável humano
1. Criar a caixa `hola@lohagoyo.cl` na Cloudez.
2. Criar conta Google com esse e-mail ("usar meu e-mail atual").
3. Criar projetos Firebase `lohagoyo-dev` e `lohagoyo-prod` (Analytics desligado), Gmail pessoal como 2º proprietário. **Não criar banco/Storage ainda** (região Santiago será escolhida juntos).
4. Criar repositório vazio privado `epistema-apps/lohagoyo` no GitHub.

## Próximos passos (Fase 2)
- Painel `/painel/` (React): login (link por e-mail + Google), cadastro do perfil, editor de serviços com preço/condições, upload de até 4 fotos, escolha de layout, consentimento.
- Cadastro assistido (equipe cadastra com consentimento registrado).
- Adaptador Firebase + testes das regras no emulador.
- Imagem OG em PNG/JPG 1200×630 (hoje `og.svg`; WhatsApp não mostra SVG na prévia).
- Guardar no perfil a estrutura/cor de tarjeta preferida (Fase 2, painel).
