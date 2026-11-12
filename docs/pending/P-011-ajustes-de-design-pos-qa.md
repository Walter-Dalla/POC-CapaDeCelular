---
id: P-011
status: open
created: 2026-11-12
related: [P-006]
---

# Decidir os desvios de design que o QA final deixou para o dono

## Problem
O QA visual comparou o app com as pranchas aprovadas a 1440 × 900 e 390 × 844. Os defeitos foram corrigidos; sobraram pontos que são escolha de produto ou desvio pequeno e conhecido.

## Strategy
Decidir cada ponto; os que mudarem viram um item pequeno de CSS:
1. Barra de ferramentas do palco aparece (desativada) na aba Modelo com a capa vazia; a prancha `Modelo.dc.html` não tem barra nesse estado. Esconder sem camadas, ou manter.
2. O selo "Medidas aproximadas" em todos os cartões empurra a medida para uma terceira linha no painel de 400 px. Aceitar, ou pôr o selo abaixo da medida. Some quando as medidas forem verificadas (P-010).
3. A fileira de ações aparece em todos os cartões de camada; a prancha `Main.dc.html` mostra só no cartão selecionado.
4. Espaçamentos sem token foram arredondados para o token mais próximo (22→20, 18→16, 14/10→12 px). Sem quebra visível; criar tokens novos só se o dono quiser o valor exato.
5. O campo "Pedido ou cliente" ficou entre as opções e a seção ARQUIVO FINAL (a prancha não o posiciona).
6. Tamanhos de fonte e algumas alturas estão como literais em px nos CSS de painel (não há token de tipografia).

## Locations
- `css/layout.css`, `css/panel-model.css`, `css/panel-images.css`, `css/panel-export.css` — onde cada ajuste cairia
- `css/tokens.css` — se entrarem tokens novos

## Code references
—

## Other references
- Pranchas: `docs/design/*.dc.html`
- Relatório da execução: `docs/reports/2026-11-12-estudio-capas.md` (§ QA)

## Open questions
- Barra de ferramentas na aba Modelo sem camadas: esconder ou manter?
- Selo "Medidas aproximadas": aceitar a quebra, ou mover para baixo da medida?
- Ações em todos os cartões de camada, ou só no selecionado como na prancha?
