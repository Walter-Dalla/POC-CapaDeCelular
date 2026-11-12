---
id: P-007
status: open
created: 2026-11-11
related: [P-001, P-003, P-006, P-008]
---

# Desfazer e refazer as alterações da composição

## Problem
No editor descrito em P-003, um arrasto errado, uma camada removida por engano ou uma troca de modelo não têm volta: o usuário precisa refazer à mão. P-003 deixou desfazer/refazer fora do escopo; o dono pediu que entre agora (2026-11-11). É barato enquanto o estado está nascendo e caro de encaixar depois.

## Strategy
1. Histórico em `js/history.js`, funções puras sobre instantâneos do estado do projeto (`modelId`, modelo personalizado, `layers`, `background`). A seleção (`selectedLayerId`) não entra no histórico.
2. Instantâneos são baratos: o estado é imutável (P-001, `js/state.js` é o único que muda o estado) e as camadas guardam uma referência ao `bitmap`, nunca uma cópia dos pixels.
3. Um passo por ação do usuário, não por evento: um arrasto, um giro ou uma pinça inteiros viram **um** passo, registrado ao soltar o ponteiro. Teclas de seta repetidas em sequência (menos de 500 ms entre elas) agrupam num passo.
4. `js/state.js` ganha `commit()` (fecha um passo), `undo()`, `redo()`, `canUndo()`, `canRedo()`. Uma ação nova depois de desfazer descarta o que havia para refazer. Limite de 100 passos; o mais antigo sai.
5. Entram no histórico: adicionar, remover, duplicar, mover, escalar, girar, reordenar, preencher, caber, centralizar, cor de fundo e troca de modelo. Não entram: aba aberta, opções da aba Exportar, seleção.
6. Interface: dois botões de ícone (desfazer, refazer) na barra de ferramentas do palco, antes de "Preencher", desativados quando não há passo; atalhos `Ctrl/Cmd+Z` e `Ctrl/Cmd+Shift+Z` (e `Ctrl+Y`), ignorados quando o foco está num campo de texto.
7. Desfazer a remoção de uma camada devolve a imagem: o `bitmap` só é liberado (`close()`) quando nenhum passo do histórico o referencia mais.

## Locations
- `js/history.js` (novo) — pilha de passos, puro
- `js/state.js` — `commit`, `undo`, `redo`, `canUndo`, `canRedo`
- `js/stage.js` — fechar o passo ao fim de cada gesto; atalhos de teclado
- `js/layers.js` — liberar `bitmap` só quando sai do histórico
- `index.html`, `css/app.css` — botões na barra de ferramentas do palco
- `tests/history.test.js` (novo) — desfazer/refazer, descarte do refazer, limite de passos, agrupamento

## Code references
Os arquivos deste item nascem em P-001 e P-003; do código atual só existe o que eles substituem:
- `configs` `js/p5.js:2` — estado global mutável, sem histórico [code js/p5.js:2-12]
- `mouseDragged` `js/p5.js:53` — altera a posição a cada evento do mouse; no editor novo o passo fecha ao soltar [code js/p5.js:53-60]

## Other references
- P-003 § Strategy 8 — listava desfazer/refazer como fora do escopo; passa a valer este item.
- P-006 — os dois botões não estão nas pranchas aprovadas; usam o componente "botão de ícone" de `docs/design/Sistema.dc.html`.
- P-008 — o rascunho salvo guarda só o estado atual, não o histórico.
- Aceitação: `npm test` passa; `/wh:qa-visual`: mover, girar, remover e trocar de modelo, desfazer tudo até o palco vazio e refazer tudo até o estado final, com mouse e por atalho.

## Open questions
—
