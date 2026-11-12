---
id: P-010
status: open
created: 2026-11-12
related: [P-002]
---

# Confirmar as medidas das capas e incluir os quatro modelos que ficaram fora do catálogo

## Problem
O catálogo (`data/models.json`) saiu com seis modelos (iPhone 13, 14, 15, 15 Pro Max, Galaxy S24, Moto G54), todos com `verified: false` e o selo "Medidas aproximadas": as medidas vêm das especificações do aparelho, não do gabarito da capa. Galaxy S23, A15, A54 e Redmi Note 13 ficaram fora porque nenhuma fonte oficial pôde ser lida na análise (decisão do dono, 2026-11-11). Raio dos cantos e recorte da câmera são estimativas em todos.

## Strategy
1. O dono obtém os gabaritos do fornecedor de capas em branco (largura, altura, raio, recorte da câmera, sangria).
2. Atualizar cada entrada de `data/models.json` com as medidas do gabarito e `verified: true`; o selo some sozinho.
3. Incluir os quatro modelos pendentes. Valores de memória, a confirmar (mm): S23 70,9 × 146,3; A15 76,8 × 160,1; A54 76,7 × 158,2; Redmi Note 13 75,3 × 162,2.
4. Registrar a fonte de cada medida num arquivo de docs (por modelo), para a próxima revisão do catálogo.

## Locations
- `data/models.json` — entradas do catálogo
- `tests/catalog-data.test.js` — a lista de modelos esperada

## Code references
- `validateModel`, `validateCatalog` `js/catalog.js` — regras que as entradas novas precisam passar

## Other references
- Relatório da execução: `docs/reports/2026-11-12-estudio-capas.md`

## Open questions
- Qual é o fornecedor das capas e ele entrega gabarito por modelo?
