---
id: P-003
status: open
created: 2026-11-11
related: [P-001, P-002, P-004, P-006, P-007, P-008]
---

# Compor a capa com uma ou mais imagens: mover, redimensionar, girar e ordenar camadas

## Problem
A POC aceita uma única imagem, no tamanho original, e só permite arrastá-la. O arrasto recentraliza a imagem no ponteiro (ela salta ao primeiro movimento), não há escala nem rotação, e não funciona com toque. Cada clique em "Adicione uma imagem" cria um novo campo de arquivo na página. O dono quer selecionar "uma ou mais imagens para fazer um recorte": posicionar várias imagens dentro do contorno da capa e ver o que será impresso.

## Strategy
1. Modelo de camada, em `js/layers.js` (funções puras sobre o estado, com teste):
   `{ id, name, bitmap, naturalWidth, naturalHeight, cx, cy, width, rotation }` — `cx`, `cy` e `width` em mm a partir do centro da capa, `rotation` em graus; a altura sai da proporção da imagem. Operações: adicionar, remover, duplicar, mover, escalar, girar, subir/descer na ordem, ajustar ("preencher a capa" e "caber na capa"), centralizar.
2. Entrada de imagens na aba **Imagens**: seletor de arquivos com `multiple`, arrastar e soltar sobre o palco, e colar da área de transferência. Decodificar com `createImageBitmap` respeitando a orientação EXIF. Aceitar PNG, JPEG e WebP; arquivo de outro tipo gera aviso, não erro silencioso. Uma imagem nova entra no modo "preencher a capa".
3. `js/stage.js`: render do palco em Canvas 2D, sob demanda (a cada mudança de estado, via `requestAnimationFrame`), com `devicePixelRatio`. Ordem do desenho: cor de fundo, camadas recortadas pelo contorno da capa, a parte das imagens fora da capa esmaecida (para o usuário ver o que sobra), recortes da câmera, contorno da capa, linha de sangria, alças da camada selecionada.
4. Gestos por Pointer Events (mouse, toque e caneta num só código):
   - toque/clique seleciona a camada mais alta sob o ponteiro, levando em conta a rotação;
   - arrastar move mantendo o ponto agarrado sob o ponteiro (sem salto);
   - alças nos cantos escalam mantendo a proporção; alça superior gira, com encaixe a cada 15° ao segurar Shift;
   - roda do mouse escala a camada selecionada; pinça com dois dedos escala e gira;
   - teclado: setas movem 1 mm (0,1 mm com Shift), Delete remove, `[` e `]` mudam a ordem.
5. Guias de encaixe ao mover: centro horizontal e vertical da capa.
   - **Margem de segurança**: linha tracejada interna, a 3 mm do contorno da capa (valor por modelo, campo opcional `safeMargin` no catálogo de P-002, padrão 3), mostrando onde rostos e textos correm risco de corte ou de cair na curva da borda. Só no palco; nunca sai no arquivo exportado. Entra na legenda do palco ("Margem de segurança 3 mm") e pode ser ocultada por um botão de ícone na barra de ferramentas do palco.
6. Lista de camadas na aba Imagens: miniatura, nome, e botões de subir, descer, duplicar, remover, preencher, caber. Cor de fundo da capa (padrão branco) no mesmo painel.
7. Aviso de resolução por camada: DPI efetivo = `naturalWidth / (width / 25,4)`. Abaixo de 150 DPI a camada mostra o aviso "imagem com baixa resolução para impressão", que reaparece na aba Exportar (P-004).
8. Fora do escopo: texto, filtros e recorte interno da imagem (crop por camada). Desfazer/refazer é o item P-007; salvar o rascunho entre sessões é o P-008.

## Locations
- `js/layers.js` (novo) — operações de camada
- `js/stage.js` (novo) — render do palco e gestos
- `js/geometry.js` — teste de ponto em retângulo girado, transformação mm→px do palco
- `js/state.js` — `layers`, `selectedLayerId`, `background`
- `js/main.js` — liga entrada de arquivos, palco e lista de camadas
- `index.html`, `css/app.css` — conteúdo da aba Imagens e o palco
- `tests/layers.test.js` (novo), `tests/geometry.test.js` — operações de camada e teste de ponto

## Code references
- `mouseDragged` `js/p5.js:53` — arrasto atual, que recentraliza no ponteiro (`js/p5.js:57-58`); substituído pelos gestos do passo 4 [code js/p5.js:53-60]
- `loadUserImage` `js/p5.js:63` — cria um novo `input` a cada clique; substituído pelo seletor único com `multiple` [code js/p5.js:63-67]
- `handleUserImageLoad` `js/p5.js:69` — troca a única imagem (`js/p5.js:72`); passa a adicionar uma camada [code js/p5.js:69-75]
- `draw` `js/p5.js:33` — render contínuo (laço `draw` do p5); passa a ser sob demanda [code js/p5.js:33-36]

## Other references
- P-001 § Strategy 4 — regra de unidade; P-002 § Strategy 3 — contorno da capa vindo do catálogo.
- `mike.png` — imagem padrão atual; o palco passa a abrir vazio, com instrução de como adicionar imagens (remoção do arquivo em P-005).
- Aceitação: `npm test` passa; `/wh:qa-visual` com três imagens: adicionar, mover, escalar, girar, reordenar, remover, em janela de 1280 px e em 390 px com toque emulado; nenhuma camada salta ao iniciar o arrasto.

## Open questions
- Recorte interno por camada (cortar um pedaço da foto antes de posicionar) faz falta já, ou basta o recorte pelo contorno da capa? Este item assume que basta o contorno. → Faz falta já: recorte por camada entra nesta rodada (campo `crop` na camada, em frações da imagem original; modo de recorte no palco com "Imagem inteira", "Cancelar" e "Aplicar recorte"; ação "Recortar" em cada camada; um passo de desfazer ao aplicar) (owner, 2026-11-11)
- Desfazer/refazer entra nesta rodada? → Sim, como item próprio, P-007 (owner, 2026-11-11)
- Cor da linha da margem de segurança? Não está nas pranchas aprovadas; este item assume `--color-warn` (`#FFD447`) tracejado, para não se confundir com a sangria (`--color-guide`). Medido (2026-11-11): `#FFD447` sobre o fundo branco padrão da capa tem contraste 1,42:1, a linha some; ela é desenhada dentro da capa, por cima da arte. Precisa de um traço escuro por baixo (como o recorte da câmera nas pranchas: fundo `#102B26`, borda branca). → Tracejado amarelo `#FFD447` sobre um traço escuro `#102B26`; o mesmo para as guias de encaixe (owner, 2026-11-11)
