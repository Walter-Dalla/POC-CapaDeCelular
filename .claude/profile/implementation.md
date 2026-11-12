# Profile of /wh:implementation

## Commands
build: — [repo tree: sem build]
suite: `npm test` [owner]
typecheck: `npm run check` [owner]
service: `python3 -m http.server <port>` [owner]
health: `curl -sf -o /dev/null http://localhost:<port>/` [owner]

## Build
— (sem build; a verificação por item é a chave `typecheck`) [repo tree]

## Tests
— (sem testes nem framework de teste; aceitação de um item = verificação visual, § Visual or e2e QA) [repo tree]

## Checks
`typecheck` de § Commands: sintaxe do sketch, por item [owner]

## Disposable service
Chaves `service` e `health` de § Commands; parar com `kill <pid>`; sem estado nem fixtures [owner]
As imagens vêm do GitHub Pages (`_common § Limits`): mudanças em `phone.png`/`mike.png` só aparecem localmente se o sketch apontar para o caminho local [js/p5.js]

## Contract
`route.json` (`data[].ID`, `data[].RoutePoints[].{x,y}`): formato persistido, ainda sem consumidor no código [route.json]
URLs das imagens no GitHub Pages [js/p5.js]

## Union files
—

## Protected files
`CLAUDE.md`, `.claude/profile/*`, `docs/pending/*` [adopt]

## Enricher reading
Sempre `CLAUDE.md` e `js/p5.js` inteiro (é todo o código) [repo tree]

## Visual or e2e QA
`/wh:qa-visual` com o serviço na porta de QA (`_common § Ports`); sem perfil `qa-visual` ainda [inferred]

## Closing docs
Changelog: — ; status de features: — ; itens em aberto do dono: `docs/pending/` ; convenções: — ; glossário: — ; mapa de features: — [adopt]

## Report
— (default `docs/reports/<date>-<slug>.md`)

## Models
— (default da skill)

## Worktree commands
—
