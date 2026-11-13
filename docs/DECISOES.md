# Decisões — Lo Hago Yo

Registrado em 12/11/2026. Segue o **Padrão tecnológico do ecossistema Epistema**; aqui ficam só as escolhas próprias deste app e os desvios justificados.

## O que é

Plataforma **gratuita** onde profissionais independentes de serviços gerais (piscinas, jardim, limpeza, reparos…) se cadastram, montam seus serviços e ganham uma página pública com contato por WhatsApp. A home é uma busca por serviço e comuna. Começa em Santiago; multi-cidade depois.

- **Marca:** LoHagoYo.cl. **A Epistema nunca é citada publicamente** (regra para iniciativas filantrópicas: só aparece a marca do projeto). Domínio único: `lohagoyo.cl`. Logo sóbrio (Plus Jakarta Sans), `Yo` e ponto em **tijolo**, `.cl` pequeno; paleta sóbria: quase-preto `#1A1918`, pedra `#F3F1EE`, branco, cinza quente `#6F6A64` e acento **tijolo `#A23B2A`** (sobre escuro `#E28A72`). Nada de azul nem dourado (não repetir a identidade da Epistema).
- **Responsável pelos dados (público):** LoHagoYo.cl. Pendente: definir a pessoa ou entidade legal que assina termos e privacidade sem expor a Epistema.
- **Interface:** espanhol do Chile. Trabalho e documentação: português.

## Pilha (stack)

| Camada | Escolha | Observação |
|---|---|---|
| Páginas públicas | **Astro** (HTML estático) | **Desvio do padrão React+Vite puro**: SEO e vista prévia de link no WhatsApp exigem HTML pronto. Astro usa Vite e TypeScript; mesma base do site Novida. |
| Painel do profissional | **React** (ilha dentro do Astro, PWA) | Segue o padrão. |
| Login | Firebase Auth: **e-mail + senha (qualquer e-mail)** + Google | Sem SMS (pago). O e-mail da conta é o canal de comunicação com o profissional. |
| Banco | Firestore `southamerica-west1` (Santiago) | Coleções planas. |
| Fotos | Firebase Storage | Exige **Blaze**. Ver custos. |
| Hospedagem | Firebase Hosting | A Cloudez não é usada. |
| Republicação | GitHub Actions agendado | Lê perfis aprovados e publica; só reconstrói se algo mudou (1 leitura de checagem). |
| PDF do cartão | `pdf-lib` + `qrcode` no navegador | Sem custo de servidor. |

## Arquitetura de dados

- **Nenhum import do Firebase fora de `src/dados/` e `src/auth/`.**
- Tipos do domínio em `src/dominio/tipos.ts`, independentes do banco.
- `src/dados/contrato.ts` define o contrato; adaptadores:
  - `adaptador-local.ts` — dados fictícios (`src/dados/semilla.ts`), usado no desenvolvimento e enquanto não há Firebase.
  - `adaptador-firebase.ts` — Firestore (a ligar quando os projetos existirem).
- Coleções:
  - `profissionais` (**privado**: nome completo, documento, e-mail, telefone real)
  - `perfis` (**público**: slug, nome público, fotos, layout, comunas, contatos escolhidos, status)
  - `servicos` (**público**: `perfilId`, nome, descrição, preço opcional, mão de obra × materiais, condições, temporadas)
  - `categorias`, `regioes`, `consentimentos`, `denuncias`

## Serviços (modelo)

Cada serviço tem: nome, descrição, itens incluídos e **preço opcional** com tipo:
`fijo` · `desde` · `por_visita` · `por_hora` · `por_m2` · `mensual` · `a_cotizar`.
Mais: insumos incluídos ou à parte, mão de obra e materiais separados (opcional), extras com custo à parte, frequência por temporada, público (casas / edifícios / empresas).

## Página de cada profissional

É **o site da pessoa**, não uma ficha do portal: marca e nome dela no topo, portada com a foto que ela escolheu (com filtro para ficar sempre bonita), serviços, sobre mim, trabalhos e contato. O portal aparece apenas discreto no rodapé ("Página creada con LoHagoYo.cl"). A tarjeta não aparece na página pública (é ferramenta do profissional, vai para o painel).

## URLs

`lohagoyo.cl/<slug>` (ex.: `/manu-piscinas`). **Sem subdomínio por pessoa**: Firebase Hosting não aceita curinga, e caminho concentra o SEO. Categorias: `/servicios/<categoria>/`.

## Contato e e-mail

- Contato **só por WhatsApp** (`wa.me` com mensagem pronta: abre o app no celular) + botão de ligar. Sem chat, sem formulário, sem e-mails da plataforma.
- Sem caixas de e-mail por profissional (o profissional pode mostrar o próprio e-mail, se quiser).
- Único e-mail automático: link de login do Firebase Auth.
- Mensagens dentro do app ficam como ideia futura, só se houver necessidade.

## Painel e moderação

- Foto pessoal **obrigatória** para enviar à revisão (garantido também nas regras do Firestore).
- Capa e fotos de trabalhos: subir ou escolher do banco (do rubro primeiro).
- Moderação em `/panel/admin/`: o responsável vê, contata (WhatsApp/correo) e aprova com um clique. Edições de perfil já aprovado seguem publicadas.
- Publicação ainda manual (`npm run publicar`); automatizar com GitHub Actions agendado quando o repositório existir.

## Cartão de visita

PDF gerado no navegador: **9 × 5 cm** com sangria de 3 mm e marcas de corte (gráfica) e **folha A4 com 10 cartões** (impressão caseira). 4 estruturas × 4 cores da paleta, nome em destaque e logo discreto, QR para a página do profissional. Tipografia fixa (a da marca).

## Apoiadores ("Dale pega") — fase futura

Fundo **coletivo e discreto** (financiar cartões/kits). **Nenhum perfil mostra que a pessoa foi ajudada** (não expor situação de necessidade). Sem dinheiro passando pela plataforma no início.

## Custos e proteção

- Blaze na produção; `-dev` no Spark/emulador.
- 50 profissionais ≈ USD 0–0,10/mês. Páginas públicas estáticas: visitantes não leem o banco.
- **Alerta em USD 1** e **corte automático em USD 5** (função que desliga a cobrança).
- Riscos evitados: SMS, build relendo tudo, leitura em loop, robôs (App Check + limites nas regras: até 4 fotos, 2 MB cada), fotos servidas direto do Storage (são copiadas para o Hosting no build).

## Domínio

`lohagoyo.cl` registrado no NIC Chile, DNS na Cloudez (onde também fica o e-mail). **Não mexer no NIC.** No lançamento: adicionar no DNS da Cloudez os registros que o Firebase Hosting pedir (TXT + A), mantendo os MX do e-mail; depois apagar a aplicação Node da Cloudez (domínio e e-mail continuam).

## Infra e contas (feito pelo responsável humano)

**Separação:** Lo Hago Yo é uma iniciativa, **não um produto** da Epistema. Só o código fica na estrutura da Epistema; Firebase e contas são próprios.

- **E-mail:** caixa simples `hola@lohagoyo.cl` na Cloudez (onde o domínio já está).
- **Conta Google própria criada com `hola@lohagoyo.cl`** ("usar meu e-mail atual": sem Gmail, sem Workspace, grátis). Gmail pessoal do responsável como segundo proprietário.
- Firebase: `lohagoyo-dev` e `lohagoyo-prod` nessa conta, região `southamerica-west1` (Santiago), proteção contra exclusão.
- GitHub: `epistema-apps/lohagoyo` (privado, deploy key própria) — a tecnologia é da Epistema.
- A plataforma **não envia e-mails**, exceto o link de login do Firebase Auth (automático, grátis).

## Fases

1. Base + páginas públicas + perfil com 3 layouts + cartão PDF, com dados fictícios. ← **atual**
2. Painel: login, cadastro (auto e assistido), serviços, fotos, consentimento.
3. Firebase real + moderação + republicação automática.
4. Home com busca completa, páginas por comuna, SEO, PWA.
5. Apoiadores (Dale pega).

## 2026-11-12 — Normas de calidad e auditoria automática
- Regra pública em `/normas/` (link no rodapé, Súmate, Términos, painel e aceite `2026-11-12c`): **2 opiniões de 1–2 estrelas entre as 10 mais recentes** confirmadas desde a última auditoria (`perfis.auditadoEm`), a página sai do ar automaticamente (function `verificarBloqueio`), fica um aviso neutro `/en-verificacion/` no endereço (sem nome nem motivo, noindex), o profissional recebe e-mail e pode responder no painel; o admin decide na aba "En auditoría". "Volver a publicar" grava `auditadoEm` e zera a contagem; o profissional é avisado por e-mail.
- Único ponto em que o site admite revisão humana (exigência da Ley 21.719 contra decisões só automatizadas com efeito significativo).
- Tom do site: "você faz, o sistema publica"; nunca "nós".

## 2026-11-12 — Proteção contra robôs nas opiniões
- Visitante não grava mais no Firestore: a opinião passa pela função `enviarOpiniao` (servidor). Regras fecham `avaliacoes`/`avaliacoesPrivado` (só moderador) e `denuncias` (sem formulário público).
- Limites: 1 opinião por e-mail por profissional; até 3 por e-mail em 24 h; teto de 40 e-mails de confirmação por hora; e-mails descartáveis recusados; campo-isca e tempo mínimo de 4 s (robô recebe "ok" falso e é descartado).
- Fluxo mantido: ao confirmar pelo e-mail, a opinião é publicada direto.
- App Check (reCAPTCHA Enterprise, invisível) pronto no código: liga com `RECAPTCHA_SITE_KEY` em `src/dados/config-firebase.ts` + `APP_CHECK=1` em `functions/.env`. A chave é criada pelo responsável no console.
