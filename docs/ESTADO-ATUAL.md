# Estado atual — Lo Hago Yo

Atualizado em 12/11/2026 · versão 0.1.0 · **Fase 1 concluída (com dados fictícios)**

## Pronto
- Projeto Astro 7 + React 19 + TypeScript (`~/Epistema/lohagoyo`), Node portátil 24.
- Decisões registradas em `docs/DECISOES.md`.
- Tipos do domínio (`src/dominio/`), contrato de dados e adaptador local com semilla fictícia (`src/dados/`).
- Páginas públicas estáticas: home com busca (sem acento) e filtro por comuna; `/servicios/<categoria>/`; perfil `/<slug>/` com **3 layouts** (`foto`, `claro`, `compacto`); `/sumate/`; `/privacidad/` (rascunho); 404; `sitemap.xml`; `robots.txt`.
- SEO: canonical, Open Graph, JSON-LD (`WebSite`, `BreadcrumbList`, `LocalBusiness` com catálogo de serviços).
- Serviços com preço opcional (7 tipos), mão de obra × materiais, temporadas, extras, botão "Cotizar por WhatsApp" com mensagem pronta.
- **Tarjeta de presentación em PDF** no navegador: 3 modelos (Clásico, Color, Mínimo); 9 × 5 cm com sangria 3 mm e marcas de corte; folha A4 com 10.
- **Marca ¡Lo Hago Yo!**: logo em curvas (`public/marca/`: `logo.svg` horizontal, `logo-negativo.svg`, `logo-sticker.svg`, `icone.svg`); paleta azul cobalto `#2433C8` + amarelo `#FFC61A` + tinta `#0E1230`; títulos em Unbounded, texto em Atkinson Hyperlegible. Gerador em `docs/marca/gerar-logo.mjs` (precisa de `opentype.js` e `@fontsource/unbounded`).
- Rascunho de `firestore.rules` e `storage.rules`, `firebase.json` (Hosting + emuladores).
- Testes: `npm test` (10 passando). Build: 11 páginas.

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
- Usar o logo também no PDF da tarjeta (hoje só texto).
