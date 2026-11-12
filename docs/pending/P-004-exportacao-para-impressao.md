---
id: P-004
status: open
created: 2026-11-11
related: [P-001, P-002, P-003, P-006, P-008]
---

# Exportar a arte da capa como imagem no tamanho físico, pronta para a impressora

## Problem
A POC não gera arquivo nenhum: o resultado existe só no canvas de 400×800 px da tela. O dono quer "extrair o arquivo em um formato de imagem para enviar a uma impressora […] para imprimir em uma capa de celular". Para imprimir no tamanho certo, o arquivo precisa ter as dimensões físicas da capa numa resolução de impressão, e carregar essa resolução nos metadados; sem isso o programa da impressora abre a imagem a 72 ou 96 DPI e a capa sai no tamanho errado.

## Strategy
1. `js/export.js`: renderiza a composição num canvas fora da tela, do estado em mm direto para pixels (`px = mm / 25,4 × dpi`), usando o mesmo código de desenho das camadas do palco (P-003), sem alças, guias nem contorno. Nunca amplia o canvas da tela.
2. Opções na aba **Exportar**:
   - **Formato**: PNG (padrão, sem perda, com transparência) ou JPEG (qualidade 95, fundo sempre opaco).
   - **Resolução**: 300 DPI (padrão), 150 ou 600.
   - **Sangria**: ligada por padrão, com o valor do modelo (`bleed`), editável em mm. Com sangria, a arte se estende além do contorno da capa.
   - **Recorte**: "retângulo inteiro" (padrão: a imagem cobre o retângulo da capa mais a sangria, e quem corta é a impressora ou o gabarito) ou "no contorno da capa" (cantos arredondados, fora transparente; só PNG).
   - **Furo da câmera**: não marcar (padrão) ou deixar transparente.
   - **Espelhar horizontalmente**: desligado por padrão; necessário em sublimação, em que a arte é transferida invertida.
3. Resumo antes de baixar: tamanho final em mm e em pixels, e os avisos de baixa resolução das camadas (P-003 § Strategy 7).
4. Metadados de resolução, em `js/png-dpi.js` (funções puras sobre bytes, com teste):
   - PNG: inserir o chunk `pHYs` (pixels por metro = `dpi / 0,0254`, arredondado; unidade 1), com CRC, logo depois do `IHDR`.
   - JPEG: gravar a densidade no cabeçalho JFIF (`APP0`: unidade 1, densidade X e Y = DPI).
5. Download por `canvas.toBlob` → bytes com metadados → `Blob` → link temporário. Nome: `capa-<id do modelo>-<largura>x<altura>mm-<dpi>dpi.png`.
   - **Identificação do pedido**: campo de texto opcional na aba Exportar, acima do resumo ("Pedido ou cliente", até 40 caracteres). Quando preenchido, entra no começo do nome do arquivo, normalizado (minúsculas, sem acentos, espaços e símbolos viram `-`): `1234-joao-silva-capa-apple-iphone-15-75.6x151.6mm-300dpi.png`. A normalização é função pura, com teste. O valor fica só no nome do arquivo: não é impresso na arte. É guardado no rascunho (P-008) e limpo em "Novo projeto".
6. Limite: se a largura ou a altura passarem de 8192 px (não acontece com capa de celular a 600 DPI, mas pode com modelo personalizado), bloquear com mensagem pedindo um DPI menor, em vez de gerar um arquivo em branco.
7. Tudo acontece no navegador: nenhuma imagem do usuário sai da máquina. Dizer isso na aba Exportar.
8. Limitação a registrar na interface: o navegador gera RGB (sRGB), não CMYK; a conversão de cor fica com o programa da impressora.
   - Alternativa descartada: gerar PDF. Pediria uma biblioteca externa ou um gerador de PDF escrito à mão; PNG com `pHYs` já carrega o tamanho físico e é aceito pelos programas de impressão. Volta se a impressora do dono exigir PDF.

## Locations
- `js/export.js` (novo) — render em tamanho físico e download
- `js/png-dpi.js` (novo) — `pHYs` no PNG e densidade JFIF no JPEG
- `js/stage.js` — extrair o desenho das camadas para uma função compartilhada entre palco e exportação
- `js/geometry.js` — dimensões em pixels a partir de mm, DPI e sangria
- `index.html`, `css/app.css` — conteúdo da aba Exportar
- `tests/png-dpi.test.js` (novo) — o PNG gerado continua válido (assinatura, ordem dos chunks, CRC) e lê o DPI pedido; o mesmo para JPEG
- `tests/export-name.test.js` (novo) — nome do arquivo com e sem identificação do pedido (acentos, espaços, símbolos, vazio)
- `tests/geometry.test.js` — tamanho em pixels (ex.: 71,6 mm + 2 mm de sangria por lado a 300 DPI = 893 px; 147,6 + 4 = 151,6 mm = 1791 px; 300 DPI = 11811 px/m) [medido com `Math.round(mm / 25.4 * dpi)`; bate com `docs/design/Exportar.dc.html`]

## Code references
- `setup` `js/p5.js:20` — canvas fixo de 400×800 px (`js/p5.js:21`), sem relação com medida física; a exportação calcula o tamanho a partir do modelo [code js/p5.js:20-21]
- `draw` `js/p5.js:33` — único render existente, para a tela; a exportação é um segundo destino do mesmo desenho [code js/p5.js:33-36]

## Other references
- P-002 § Strategy 1 — `case` e `bleed` do modelo; P-003 § Strategy 1 — camadas em mm.
- Especificação PNG, chunk `pHYs`; especificação JFIF, segmento `APP0`.
- Aceitação: `npm test` passa; um PNG exportado a 300 DPI, aberto com `file` ou `python3 -c` (PIL não é requisito: ler o `pHYs` direto dos bytes), tem as dimensões em pixels esperadas e 11811 pixels por metro; a composição exportada bate com a do palco (mesma posição, escala e rotação das camadas).

## Open questions
- Qual é a impressora e o processo? O pedido fala em "impressora matricial", que não imprime em capa; capas costumam ser feitas em impressora UV ou por sublimação. A resposta define os padrões: sublimação pede espelhamento ligado; UV, não. Este item assume saída genérica (PNG, 300 DPI, sem espelhar). → Saída genérica: PNG, 300 DPI, sem espelhar por padrão (owner, 2026-11-11)
- O programa da impressora exige algum formato ou resolução específicos (TIFF, PDF, 600 ou 720 DPI)? Este item assume que PNG ou JPEG bastam. → PNG ou JPEG bastam (owner, 2026-11-11)
- O arquivo deve sair no tamanho de uma capa, ou montado numa folha/berço com várias capas (ex.: A4 com posições fixas)? Este item assume uma capa por arquivo. → Uma capa por arquivo (owner, 2026-11-11)
