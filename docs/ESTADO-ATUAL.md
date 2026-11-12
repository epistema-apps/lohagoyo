# Estado atual — Lo Hago Yo

Atualizado em 12/11/2026 · versão 0.1.0 · **Fase 1 concluída (com dados fictícios)**

## Pronto
- Projeto Astro 7 + React 19 + TypeScript (`~/Epistema/lohagoyo`), Node portátil 24.
- Decisões registradas em `docs/DECISOES.md`.
- Tipos do domínio (`src/dominio/`), contrato de dados e adaptador local com semilla fictícia (`src/dados/`).
- Páginas públicas estáticas: home com busca (sem acento) e filtro por comuna; `/servicios/<categoria>/`; perfil `/<slug>/` com **3 layouts** (`foto`, `claro`, `compacto`); `/sumate/`; `/privacidad/` (rascunho); 404; `sitemap.xml`; `robots.txt`.
- SEO: canonical, Open Graph, JSON-LD (`WebSite`, `BreadcrumbList`, `LocalBusiness` com catálogo de serviços).
- Serviços com preço opcional (7 tipos), mão de obra × materiais, temporadas, extras, botão "Cotizar por WhatsApp" com mensagem pronta.
- **Tarjeta de presentación em PDF** no navegador: **4 estruturas** (Clásica, Dividida, Franja, Punto) × **4 cores da paleta** (Azul, Noche, Blanco, Amarillo); logo discreto no canto; QR vetorial; fontes da marca embutidas; 9 × 5 cm com sangria 3 mm e marcas de corte, ou folha A4 com 10. Prévia instantânea no perfil (mesmo desenho do PDF, `src/components/cartao/desenho.ts`).
- **Marca LoHagoYo.cl**: logo em curvas, Plus Jakarta Sans 600, `LoHago` tinta + `Yo` cobalto + ponto amarelo + `cl` pequeno (`public/marca/logo.svg`, `logo-negativo.svg`, `icone.svg` "Yo."). Paleta cobalto `#2433C8`, amarelo `#FFC61A`, tinta `#0E1230`. Títulos em Plus Jakarta Sans, texto em Atkinson Hyperlegible, **fontes servidas pelo próprio site**. Gerador: `node docs/marca/gerar-logo.mjs`.
- Rascunho de `firestore.rules` e `storage.rules`, `firebase.json` (Hosting + emuladores).
- Testes: `npm test` (11 passando). Build: 11 páginas.

## Comandos
```
export PATH=~/.local/node-v24.22.2-darwin-arm64/bin:$PATH
npm run dev     # http://localhost:4321
npm test
npm run build
```

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
