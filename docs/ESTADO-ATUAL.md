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

## No ar
- **https://lohagoyo.cl** (Firebase Hosting `lohagoyo-prod`, conta `hola@lohagoyo.cl`, plano Spark). `www` redireciona para o domínio principal.
- DNS na Cloudez: A `@` → 199.36.158.100, TXT `hosting-site=lohagoyo-prod`, CNAME `www` → lohagoyo-prod.web.app. E-mail (MX/mail/SPF/DKIM) intocado na Cloudez.

## Publicação (Firebase Hosting, plano grátis)
- `npm run publicar` = gera imagens de prévia (`scripts/gerar-og.py`) + build de produção + `firebase deploy --only hosting --project lohagoyo-prod --account hola@lohagoyo.cl` (conta fixa; nunca a da Epistema).
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

## Painel (Fase 2) — no ar desde 12/11/2026 (Blaze, Auth, Firestore e Storage em Santiago ativos; proteção contra exclusão e backup diário)
- `/panel/`: cria conta com **qualquer e-mail e senha** (ou Google), recupera senha. Editor em 8 seções: foto pessoal (**obrigatória**), quem é, onde/para quem, contato (+ nome completo privado), serviços (preço opcional, materiais, temporadas, extras), fotos da página (**subir ou escolher do banco**), tarjeta (estrutura/cor, aparece no fim da página pública com Compartir/Descargar), envio com consentimento.
- `/panel/admin/`: **Editar** qualquer perfil (mesmo editor, inclusive fotos) e **+ Nuevo perfil (asistido)** para cadastrar alguém do zero; administrador = uid em `config/moderadores` **e** claim `mod` no Auth (necessária para fotos). Moderação — filtros por estado, foto, dados, serviços, WhatsApp/correo/llamar em um clique, **Aprobar y publicar**, pausar/reativar. Acesso: uid em `config/moderadores.uids` (a tela mostra o uid).
- Publicação: `npm run publicar` roda `scripts/sincronizar.mjs` (lê aprovados do Firestore pela leitura pública, baixa fotos para `public/f/`), gera prévias e publica. Regras: `npm run publicar:regras`.
- Testado de ponta a ponta nos emuladores (conta, foto, serviço, banco, envio, aprovação, sincronização, página gerada).
- Regras: 18 testes (`npm run test:regras`, Java portátil em `~/.local/jre21`).

## Cadastro assistido (sem o profissional precisar entrar)
- `node scripts/importar-perfil.mjs <slug> [--foto arquivo.jpg] [--nome-completo "..."]`: copia um perfil de `data/perfis-locais.json` para o Firestore real, já aprovado (usa a sessão do firebase-tools de hola@lohagoyo.cl). Dono provisório `lhy…`; quando o profissional quiser editar, criar a conta dele com esse uid.
- `node scripts/subir-retrato.mjs <slug> <arquivo.jpg>`: coloca/troca a foto pessoal.
- Manuel importado em 12/11/2026 (`manu-piscinas`, uid `lhydde84af3d6ac45c3c82ccf9cd238`), **ainda sem foto**. Backup do perfil manual em `data/perfis-locais.bak.json`.

## Teste local com perfil real
- `data/perfis-locais.json` e `public/locais/` (fora do git) — hoje com o Manuel (`/manu-piscinas/`), usando fotos de referência. Falta WhatsApp e comunas dele.

## Pendências do responsável humano
1. ✅ Blaze (orçamento CLP 5.000), Authentication, Firestore e Storage em Santiago — feitos.
2. Entrar em **lohagoyo.cl/panel/admin/**, criar a própria conta e copiar o identificador (uid) mostrado; criar no Firestore `config/moderadores` com `uids` (array) contendo esse uid.
3. GitHub: criar o repositório vazio privado `epistema-apps/lohagoyo` (backup e publicação automática).
4. Configurar "spend caps" (pausa automática ao atingir o orçamento) no Firebase.
5. Opcional: apagar a aplicação Node.js antiga na Cloudez.
6. Pendente legal: responsável pelos dados na política de privacidade (sem expor a Epistema).

## Próximos passos (Fase 2)
- Painel `/painel/` (React): login (link por e-mail + Google), cadastro do perfil, editor de serviços com preço/condições, upload de até 4 fotos, escolha de layout, consentimento.
- Cadastro assistido (equipe cadastra com consentimento registrado).
- Adaptador Firebase + testes das regras no emulador.
- Imagem OG em PNG/JPG 1200×630 (hoje `og.svg`; WhatsApp não mostra SVG na prévia).
- Guardar no perfil a estrutura/cor de tarjeta preferida (Fase 2, painel).
