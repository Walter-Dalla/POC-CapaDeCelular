# Profile of /wh:implementation

## Commands
build: — [repo tree: sem build]
suite: `npm test` [owner]
typecheck: `npm run check` [owner]
service: `python3 -m http.server <port>` [owner]
health: `curl -sf -o /dev/null http://localhost:<port>/` [owner]

## Build
— (sem build; `scripts/build-site.sh` monta `_site/` só para o deploy do Pages) [scripts/build-site.sh]

## Tests
`node:test` + `node:assert/strict`, sem dependências; um arquivo por item em `tests/*.test.js`; por item: `node --test tests/<arquivo>.test.js` [package.json]
Só funções puras e texto de CSS/HTML: os caminhos de DOM (gaveta, diálogo, arrastar/colar, IndexedDB) não têm teste automatizado, aceitação = § Visual or e2e QA [tests/]

## Checks
`typecheck` de § Commands: `node --check` em cada arquivo de `js/` e `tests/`, por item [package.json]

## Disposable service
Chaves `service` e `health` de § Commands; parar com `kill <pid>`; sem fixtures [owner]
Estado só no navegador (IndexedDB `capa-studio`): cada perfil de navegador novo começa vazio [js/draft.js]

## Contract
`data/models.json` (catálogo: `id`, `brand`, `name`, medidas em mm, `cutouts`, `verified`), validado por `validateCatalog` [js/catalog.js]
Rascunho no IndexedDB `capa-studio` v1 (`serializeDraft`/`parseDraft`): formato persistido no navegador do usuário [js/draft.js]
Nome do arquivo exportado (`exportFileName`) e metadados de DPI (pHYs no PNG, JFIF no JPEG) [js/export-name.js, js/png-dpi.js]

## Union files
—

## Protected files
`CLAUDE.md`, `.claude/profile/*`, `docs/pending/*` [adopt]

## Enricher reading
Sempre `CLAUDE.md`, `README.md` e `js/main.js` (raiz de composição: `boot()` monta `ctx`); depois os módulos de `js/` que o pedido tocar [repo tree]

## Visual or e2e QA
Chromium headless por CDP contra o serviço na porta de QA (`_common § Ports`), a 1440×900 e 390×844, comparando com `docs/design/*.dc.html`; sem perfil `qa-visual` nem driver no repo ainda (`docs/pending/P-012`) [docs/reports/2026-11-12-estudio-capas.md]

## Closing docs
Changelog: — ; status de features: — ; itens em aberto do dono: `docs/pending/` ; convenções: — ; glossário: — ; mapa de features: — [adopt]

## Report
— (default `docs/reports/<date>-<slug>.md`)

## Models
— (default da skill)

## Worktree commands
—
