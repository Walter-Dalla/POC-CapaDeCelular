# Common profile

## Clone
— (checkout atual, em WSL: `/home/walter/POC-CapaDeCelular`) [git rev-parse]

## Toolchain
Sem build nem gerenciador de pacotes: HTML + JS estático, p5.js 1.4.2 pela CDN jsdelivr [index.html]
Servidor local: `python3 -m http.server <port>` na raiz [owner]
HTTP local: `curl` (Linux, WSL) [which curl]
Matar processo: `kill <pid>` [inferred]

## Git
Main branch: `main` [git status]
PR remote: `origin` (`https://github.com/Walter-Dalla/POC-CapaDeCelular`) [git remote]
Push em `main` publica no GitHub Pages: nada vai para `main` sem o dono pedir [commit d0b1268, js/p5.js]
Identidade: a do git local (`Walter Dalla`); commits assinados com `Signed-off-by` [git log]

## Ports
Do dono (nunca usada por skill): `8000` [owner]
Agentes `/wh:implementation`: `8100–8105` [owner]
QA visual/e2e: de `8108` para cima, primeira livre [owner]

## Navigation
Sem `.codegraph/`: `grep`/`Read` direto; o código cabe num arquivo (`js/p5.js`) [repo tree]

## Docs
`CLAUDE.md` — mapa do repo [CLAUDE.md]
`docs/pending/` — itens em aberto do dono [adopt]

## Pending
— (default `docs/pending/`) [adopt]

## Limits
Produção: `https://walter-dalla.github.io/POC-CapaDeCelular/` (GitHub Pages de `main`); o sketch carrega `phone.png` e `mike.png` de lá, não do disco [js/p5.js]
Nenhum agente faz push em `main` nem fora do repo e do scratchpad [owner]
