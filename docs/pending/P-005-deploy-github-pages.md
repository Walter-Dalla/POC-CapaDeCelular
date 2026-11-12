---
id: P-005
status: open
created: 2026-11-11
related: [P-001, P-002, P-003, P-004, P-006]
---

# Publicar no GitHub Pages por workflow, com os testes como porta, e remover o legado da POC

## Problem
O dono quer que "o deploy deve ser feito no github pages". Hoje o Pages publica a raiz do branch `main` como está: qualquer push vai ao ar sem verificação, e o site publicado inclui arquivos que não são do site (`CLAUDE.md`, `docs/`, `tests/`, `package.json`). O repo ainda carrega os restos da POC (`phone.png`, `mike.png`, `route.json`) e um `README.md` em UTF-16 só com o título.

## Strategy
1. Workflow `.github/workflows/pages.yml`, disparado por push em `main` e manualmente (`workflow_dispatch`):
   - job `check`: `actions/checkout`, `actions/setup-node` (Node 22), `npm test`, `npm run check`;
   - job `deploy` (depende de `check`): monta a pasta `_site` só com o que é do site (`index.html`, `css/`, `js/`, `data/`, ícones), `actions/upload-pages-artifact`, `actions/deploy-pages`;
   - permissões `pages: write` e `id-token: write`; `concurrency` no grupo `pages`.
   - Alternativa descartada: continuar publicando o branch direto. É o que existe, mas publica sem rodar os testes e expõe os arquivos internos do repo.
2. Rodar os mesmos checks em pull request (job `check` também em `pull_request`), sem deploy.
3. Arquivo `.nojekyll` na pasta publicada, para o Pages servir os arquivos sem passar pelo Jekyll.
4. Conferir que o site funciona sob o subcaminho `/POC-CapaDeCelular/`: todos os caminhos relativos, incluindo o `fetch` de `data/models.json` e os `import` dos módulos.
5. Página: `<title>`, `meta description`, `lang="pt-BR"`, `meta viewport`, favicon em SVG e `theme-color`.
6. Remover o legado: `phone.png`, `mike.png` e `route.json` (nenhum tem consumidor depois de P-001 a P-003; o histórico do git preserva).
7. Reescrever `README.md` em UTF-8: o que o site faz, o endereço publicado, como rodar localmente (`python3 -m http.server 8000`), como rodar os testes e como acrescentar um modelo ao catálogo.

## Locations
- `.github/workflows/pages.yml` (novo) — checks e deploy
- `.nojekyll` (novo, gerado dentro de `_site` pelo workflow)
- `index.html` — metadados da página e favicon
- `favicon.svg` (novo)
- `phone.png`, `mike.png`, `route.json` — removidos
- `README.md` — reescrito em UTF-8

## Code references
- `preload` `js/p5.js:14` — único consumidor de `phone.png` e `mike.png` (`js/p5.js:16-17`), removido em P-001
- `route.json` — `data[].RoutePoints[].{x,y}`, três rotas, sem consumidor no código (`grep -rn route` não encontra nenhum)

## Other references
- `.claude/profile/_common.md` § Git e § Limits — "nada vai para `main` sem o dono pedir"; nenhum agente faz push em `main`. O workflow só roda depois que o dono fizer o merge.
- `.claude/profile/implementation.md` § Contract — lista `route.json` e as URLs das imagens no Pages como contrato; ambos deixam de existir. O perfil é protegido: o dono atualiza (`/wh:profile`).
- **Passo manual do dono**, uma vez: em Settings → Pages do repositório, trocar "Source" de "Deploy from a branch" para "GitHub Actions". Sem isso o workflow falha no job `deploy`.
- Aceitação: o workflow é YAML válido e o job `check` passa localmente com os mesmos comandos; a pasta `_site` montada localmente, servida por `python3 -m http.server` a partir de um diretório pai (para simular o subcaminho), abre sem erro no console. O deploy em si só é verificável depois do merge em `main`.

## Open questions
- `route.json` pode ser removido? Parece o traçado de contornos desenhados à mão (três rotas de pontos em coordenadas de tela) de uma ideia que não chegou ao código. Este item assume que sim.
- O site continua no endereço `walter-dalla.github.io/POC-CapaDeCelular/`, ou o repositório será renomeado agora que deixa de ser POC? Nada no código depende do nome (caminhos relativos); este item assume que o nome fica.
