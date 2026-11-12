# Decisões — Lo Hago Yo

Registrado em 12/11/2026. Segue o **Padrão tecnológico do ecossistema Epistema**; aqui ficam só as escolhas próprias deste app e os desvios justificados.

## O que é

Plataforma **gratuita** onde profissionais independentes de serviços gerais (piscinas, jardim, limpeza, reparos…) se cadastram, montam seus serviços e ganham uma página pública com contato por WhatsApp. A home é uma busca por serviço e comuna. Começa em Santiago; multi-cidade depois.

- **Marca:** LoHagoYo.cl — *una iniciativa Epistema*. Domínio único: `lohagoyo.cl`. Logo sóbrio (Plus Jakarta Sans), `Yo` em ocre, ponto e `.cl` pequeno; paleta sóbria e elegante: grafito, piedra, branco e acento ocre (nada de cores vibrantes ou lúdicas).
- **Responsável pelos dados:** Epistema (termos e política de privacidade em nome dela).
- **Interface:** espanhol do Chile. Trabalho e documentação: português.

## Pilha (stack)

| Camada | Escolha | Observação |
|---|---|---|
| Páginas públicas | **Astro** (HTML estático) | **Desvio do padrão React+Vite puro**: SEO e vista prévia de link no WhatsApp exigem HTML pronto. Astro usa Vite e TypeScript; mesma base do site Novida. |
| Painel do profissional | **React** (ilha dentro do Astro, PWA) | Segue o padrão. |
| Login | Firebase Auth: link por e-mail + Google | Sem SMS (pago). |
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
