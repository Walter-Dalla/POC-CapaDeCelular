---
id: P-002
status: open
created: 2026-11-11
related: [P-001, P-003, P-004, P-006]
---

# Escolher o modelo de celular a partir de um catálogo com as medidas da capa em milímetros

## Problem
Hoje existe uma única moldura, a imagem `phone.png` (372×750 px), sem relação com medida física e sem modelo associado. O dono quer "selecionar o meu modelo de celular". Sem as medidas reais da capa (largura, altura, raio dos cantos, recorte da câmera) não há como gerar um arquivo de impressão no tamanho certo.

## Strategy
1. Catálogo como dado, em `data/models.json`, uma entrada por modelo, tudo em milímetros, vista da **traseira** da capa (é a face impressa), origem no canto superior esquerdo:
   ```json
   {
     "id": "apple-iphone-15",
     "brand": "Apple",
     "name": "iPhone 15",
     "case": { "width": 71.6, "height": 147.6, "cornerRadius": 12 },
     "cutouts": [
       { "shape": "roundRect", "x": 4, "y": 4, "width": 34, "height": 34, "radius": 9 }
     ],
     "bleed": 2,
     "verified": false
   }
   ```
   `cutouts[].shape` aceita `roundRect` e `circle` (`cx`, `cy`, `r`). `bleed` é a sangria padrão do modelo. `safeMargin` (opcional, padrão 3) é a margem de segurança interna usada pelo palco (P-003 § Strategy 5). `verified` diz se as medidas foram conferidas com o gabarito do fornecedor da capa.
2. `js/catalog.js`: carrega o JSON, valida cada entrada (campos obrigatórios, números positivos, recortes dentro da capa) e expõe `listBrands`, `listModels(brand)`, `getModel(id)`. A validação é função pura, com teste.
3. A moldura passa a ser **desenhada** a partir das medidas (contorno arredondado + recortes), não mais uma imagem por modelo. A função de contorno fica em `js/geometry.js` e serve tanto ao palco (P-003) quanto à exportação (P-004).
4. Aba **Modelo**: busca por texto, filtro por marca, lista de modelos com miniatura desenhada do contorno e as medidas (`71,6 × 147,6 mm`). Modelo com `verified: false` mostra o selo "medidas aproximadas".
5. **Modelo personalizado**: o usuário informa largura, altura, raio dos cantos e sangria em mm. Cobre qualquer capa cujo gabarito o usuário tenha em mãos, sem depender do catálogo.
6. Trocar de modelo preserva as camadas: como elas estão em mm a partir do centro da capa, continuam centradas no novo modelo.
7. Catálogo inicial: cerca de dez modelos comuns no Brasil (iPhone 13, 14, 15 e 15 Pro Max; Galaxy S23, S24, A15 e A54; Moto G54; Redmi Note 13). Largura e altura a partir das especificações oficiais do aparelho; raio e recorte da câmera estimados. Todos entram com `verified: false` até o dono conferir com o gabarito real.
   - Largura × altura conferidas (2026-11-11): iPhone 13 71,5 × 146,7 [doc https://support.apple.com/en-us/111872 2026-11-11]; iPhone 14 71,5 × 146,7 [doc https://support.apple.com/en-us/111850 2026-11-11]; iPhone 15 71,6 × 147,6 [doc https://support.apple.com/en-us/111831 2026-11-11]; iPhone 15 Pro Max 76,7 × 159,9 [doc https://support.apple.com/en-us/111828 2026-11-11]; Galaxy S24 70,6 × 147,0 e Moto G54 73,8 × 161,6 [doc docs/design/Modelo.dc.html, prancha aprovada]. Galaxy S23, A15, A54 e Redmi Note 13: página oficial não alcançada (samsung.com sem a linha de dimensões, mi.com 403) [undetermined]; ver Open questions.
   - Alternativa descartada: buscar medidas de uma API externa. Não existe fonte pública confiável de gabaritos de capa, e o site ficaria dependente de terceiros.

## Locations
- `data/models.json` (novo) — catálogo
- `js/catalog.js` (novo) — carga, validação e consulta
- `js/geometry.js` — contorno da capa e dos recortes a partir das medidas
- `js/state.js` — `modelId` e o modelo personalizado
- `index.html`, `css/app.css` — conteúdo da aba Modelo
- `tests/catalog.test.js` (novo) — validação; inclui um teste que valida o próprio `data/models.json`

## Code references
- `preload` `js/p5.js:14` — hoje carrega a moldura única `phone.png` (`js/p5.js:16`); a moldura passa a vir do catálogo [code js/p5.js:14-18]
- `draw` `js/p5.js:33` — hoje desenha `phone.png` sobre a imagem; o desenho do contorno substitui essa chamada (`js/p5.js:36`) [code js/p5.js:33-36]

## Other references
- P-001 § Strategy 4 — regra de unidade (milímetros, origem no centro da capa para as camadas).
- `phone.png` — moldura atual, 372 × 750 px [medido com `file`]; deixa de ser usada (remoção em P-005).
- Aceitação: `npm test` passa; escolher cada modelo do catálogo muda a moldura no palco; o modelo personalizado aceita medidas e rejeita valores inválidos com mensagem.

## Open questions
- As medidas vêm de onde? A capa impressa depende do gabarito do fornecedor das capas em branco (ou do berço da impressora), que raramente coincide com a medida do aparelho. Se o dono tiver esses gabaritos, eles substituem as medidas estimadas e os modelos passam a `verified: true`. → Especificações oficiais do aparelho, todos com o selo "Medidas aproximadas"; os gabaritos entram depois por `data/models.json` (owner, 2026-11-11)
- Quais modelos entram no catálogo inicial? Enquanto não houver resposta, os dez do passo 7. → Seis agora, os de medida conferida: iPhone 13, 14, 15 e 15 Pro Max, Galaxy S24 e Moto G54; Galaxy S23, A15, A54 e Redmi Note 13 entram quando as medidas forem confirmadas (owner, 2026-11-11)
- A capa impressa cobre só a traseira plana (capa 2D) ou também as laterais (capa 3D, que precisa de gabarito desdobrado)? Este item assume só a traseira plana. → Só a traseira plana (2D) (owner, 2026-11-11)
