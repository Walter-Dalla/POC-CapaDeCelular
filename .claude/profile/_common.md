# Common profile

## Clone
— (checkout atual, em WSL: `/home/walter/POC-CapaDeCelular`) [git rev-parse]

## Toolchain
Sem build nem dependências: HTML + CSS + módulos ES estáticos; Node só para `npm test` e `npm run check` (`package.json` sem dependências) [package.json]
Servidor local: `python3 -m http.server <port>` na raiz [owner]
HTTP local: `curl` (Linux, WSL) [which curl]
Matar processo: `kill <pid>` [inferred]

## Git
Main branch: `main` [git status]
PR remote: `origin` (`https://github.com/Walter-Dalla/POC-CapaDeCelular`) [git remote]
Push em `main` publica no GitHub Pages pelo workflow `.github/workflows/pages.yml`: nada vai para `main` sem o dono pedir [.github/workflows/pages.yml]
Identidade: a do git local (`Walter Dalla`); commits assinados com `Signed-off-by` [git log]

## Ports
Do dono (nunca usada por skill): `8000` [owner]
Agentes `/wh:implementation`: `8100–8105` [owner]
QA visual/e2e: de `8108` para cima, primeira livre [owner]

## Navigation
Sem `.codegraph/`: `grep`/`Read` direto; `js/main.js` é a raiz de composição (`boot()`), um módulo por assunto em `js/`, painéis em `js/panels/`, testes em `tests/` com o nome do assunto [repo tree]

## Docs
`CLAUDE.md` — mapa do repo [CLAUDE.md]
`README.md` — como rodar, testar, publicar e editar o catálogo [README.md]
`docs/design/*.dc.html` — pranchas aprovadas do design (referência, não editar) [docs/design]
`docs/pending/` — itens em aberto do dono [adopt]
`docs/reports/` — relatórios do `/wh:implementation` [docs/reports]

## Pending
— (default `docs/pending/`) [adopt]

## Limits
Produção: `https://walter-dalla.github.io/POC-CapaDeCelular/` (GitHub Pages, publicado de `main` pelo workflow); o site só usa caminhos relativos e o único `fetch` é `./data/models.json` [tests/site-paths.test.js]
Nenhum agente faz push em `main` nem fora do repo e do scratchpad [owner]
