---
id: P-012
status: open
created: 2026-11-12
related: [P-001, P-005]
---

# Guardar um teste de fumaça de navegador e ligar os avisos que hoje só vão ao console

## Problem
A suíte (`npm test`) cobre as funções puras; os caminhos de DOM não têm teste automatizado: gaveta do celular, diálogo de confirmação, arrastar/colar arquivos, foco do teclado, rascunho no IndexedDB, modo privado. Um defeito desses (gaveta fechada na primeira carga a 390 px) passou por cinco ondas e só apareceu no QA visual final, feito à mão com um driver de Chromium headless que não ficou no repositório. Além disso, alguns riscos baixos apontados pelo QA de código ficaram sem correção.

## Strategy
1. Guardar um driver CDP pequeno e os passos do QA final em `tests/smoke/`, com um script `npm run smoke` (não entra no `npm test`: precisa de um Chromium instalado). Citar em `.claude/profile/implementation.md` § Visual or e2e QA.
2. Riscos baixos a fechar no mesmo item:
   - falha de `clearDraft` em "Novo projeto" só vai ao console; o rascunho antigo volta ao recarregar (`js/main.js`);
   - um módulo que falha ao carregar (404) deixa a página em branco, sem aviso (`BOOT_ERROR` só cobre erros depois do grafo de módulos);
   - `setPngDpi` descarta bytes depois do IEND sem avisar; `exportFileName` aceita tamanhos não finitos (`js/png-dpi.js`, `js/export-name.js`);
   - `fillLayer`/`fitLayer` limitam a largura a 5–2000 mm, então imagens de proporção extrema não cobrem nem cabem na capa (`js/layers.js`);
   - o teste do "único fetch" conta `fetch(` também em comentários (`tests/site-paths.test.js`);
   - a checagem de "foco em campo de texto" está copiada em `js/main.js`, `js/gestures.js` e `js/controls.js`; as listas de opções de exportação em `js/panels/export.js` e `js/draft.js`;
   - grafia mista: `normalizeRotation` ao lado de `centreLayer` (`js/layers.js`).
3. O grupo `concurrency` do workflow também enfileira as checagens de PR atrás de um deploy; separar os grupos se incomodar.

## Locations
- `tests/smoke/` (novo) — driver e passos
- `package.json` — script `smoke`
- arquivos citados no passo 2

## Code references
—

## Other references
- Relatório da execução: `docs/reports/2026-11-12-estudio-capas.md` (§ QA, § Problems found)

## Open questions
—
