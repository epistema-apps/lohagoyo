# Lo Hago Yo — regras do projeto

Plataforma gratuita de serviços de profissionais independentes (Santiago, Chile). Iniciativa filantrópica mantida internamente pela Epistema, **que nunca aparece publicamente**. Decisões em `docs/DECISOES.md`; situação atual em `docs/ESTADO-ATUAL.md` (atualizar a cada marco).

## Ambiente
- Node portátil: `export PATH=~/.local/node-v24.22.2-darwin-arm64/bin:$PATH` antes de qualquer comando npm.
- `npm run dev` (desenvolvimento) · `npm run build` · `npm test`.

## Regras
- **A marca Epistema nunca aparece em nada público** (site, páginas, PDFs, metadados, e-mails, textos, créditos, código enviado ao navegador). Regra para tudo que é filantrópico: só a marca LoHagoYo (sem ".cl" na marca; o domínio continua lohagoyo.cl). A menção à Epistema fica restrita a documentação interna e infraestrutura privada.
- Trabalho em português; **interface em espanhol do Chile** (tú, não vos/usted; termos locais: comuna, cotización, mantención).
- **Nenhum import de `firebase` fora de `src/dados/` e `src/auth/`.** A interface só usa as funções do contrato (`src/dados/contrato.ts`).
- Tipos do domínio em `src/dominio/tipos.ts`, sem nada do banco.
- **Dados pessoais nunca no git.** Testes e semilla só com pessoas fictícias.
- Separar público (`perfis`, `servicos`) de privado (`profissionais`). Nunca publicar algo que exponha situação de necessidade.
- Toda mudança em `firestore.rules`/`storage.rules` exige teste no emulador.
- Publicar no Firebase sempre com `--project` explícito (`lohagoyo-dev` / `lohagoyo-prod`).
- Logins e autorizações (GitHub, Firebase, Google, NIC, Cloudflare) quem faz é o responsável humano.
- Firebase e contas Google são **próprios do Lo Hago Yo** (não do Workspace Epistema). Só o GitHub fica em `epistema-apps`.
- Validar em celular (375 px) antes de publicar. Leve para celular barato.
- Independência: este app nunca lê nem grava em projetos de outros apps Epistema.
