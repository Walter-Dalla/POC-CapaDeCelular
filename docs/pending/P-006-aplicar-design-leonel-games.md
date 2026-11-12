---
id: P-006
status: open
created: 2026-11-11
related: [P-001, P-002, P-003, P-004, P-005, P-007, P-008]
---

# Aplicar o design aprovado da Leonel Games em todas as telas do estúdio de capas

## Problem
O dono aprovou o design do canvas "Leonel Games — Estúdio de Capas" ("gostei", 2026-11-11). P-001 a P-004 entregam estrutura e função; nenhum deles garante que o resultado final bata com as pranchas aprovadas: marca, paleta, tipografia, componentes, estados e a versão de celular. Sem um item próprio, cada aba sai com uma aproximação diferente do design.

## Strategy
1. Fonte da verdade: as cinco pranchas, copiadas para `docs/design/` (HTML com estilos inline; os valores exatos de cor, tamanho, raio e espaçamento estão no atributo `style` de cada elemento). Abrem também no canvas publicado.
   - `Modelo.dc.html` — aba Modelo, palco vazio
   - `Main.dc.html` — aba Imagens, camada selecionada, aviso de baixa resolução
   - `Exportar.dc.html` — aba Exportar, prévia do arquivo
   - `Celular.dc.html` — 390 px, gaveta inferior, erro de arquivo inválido
   - `Sistema.dc.html` — tokens e componentes
   As pranchas são referência visual, não código do site: usam um runtime próprio (`support.js`, `<x-dc>`) que não vai para o app. O app reescreve o visual em `css/tokens.css` e `css/app.css`, com classes, sem estilos inline.
2. Tokens em `css/tokens.css` (substituem os provisórios de P-001):

   | Token | Valor | Uso |
   |---|---|---|
   | `--color-bg` | `#102B26` | fundo, barra superior |
   | `--color-stage` | `#173A33` | palco, fundo de campos |
   | `--color-surface` | `#1E4A41` | painel |
   | `--color-brand` | `#24564C` | verde da marca |
   | `--color-card` | `#28594F` | cartões |
   | `--color-border` | `#3B7266` | divisórias |
   | `--color-border-strong` | `#5C9486` | campos, botões de ícone |
   | `--color-text` | `#FFFFFF` | texto |
   | `--color-text-2` | `#D3E4DF` | texto secundário |
   | `--color-text-3` | `#B5D0C9` | texto de apoio |
   | `--color-accent` | `#FFB52E` | ação principal (texto `#1B1300`) |
   | `--color-select` | `#FF5CA8` | camada selecionada, alças |
   | `--color-guide` | `#7DB8FF` | sangria, guias |
   | `--color-warn` | `#FFD447` | aviso (fundo `#3A3413`, texto `#FFE58A`) |
   | `--color-danger` | `#FF9B8A` | erro (fundo `#3D1D18`, texto `#FFD2CA`) |
   | `--brand-gradient` | `#F7941D → #E0218A → #6B2FA0 → #2D7FF9` | só na marca |

   Cores usadas nas pranchas e ausentes da tabela (2026-11-11, `grep` dos `style` em `docs/design/*.dc.html`); viram tokens também: `#2B5C52` (borda da barra superior, do painel e da barra de ferramentas), `#1A4239` (fundo das seções em caixa: "Modelo personalizado", "Arquivo final", área de soltar), `#245248` (pontilhado do palco), `#8FB8AD` (borda da chave desligada), `#FFB3A6` (ícone Remover e texto de erro do campo), `#CFE4FF` (texto do aviso de informação), `#FFC95E` (botão primário com foco), `#2A0A1A` (texto do selo "Selecionada"), `#3F5F58` (texto de apoio sobre a capa branca), `#111111` e `#FFC531` (amostras de cor de fundo).

   Espaçamento: 4, 8, 12, 16, 20, 24, 40 px. Raios: 8 (miniatura), 10 (botão de ícone), 12 (campo), 14 (cartão, botão principal), 999 (filtro). Sombra da capa: `0 24px 60px rgba(0,0,0,.45)`.
3. Tipografia por Google Fonts: Fredoka 500–700 (títulos, abas, botões), Nunito Sans 400–700 (texto, 15 px; apoio 13 px), Silkscreen 400 (rótulos curtos em maiúsculas e números das etapas, 12 px). Com `font-display: swap` e pilha do sistema como reserva.
4. Componentes em `css/app.css`, como na prancha `Sistema.dc.html`: botão primário, secundário e de ícone (44 px), estados de foco (contorno branco de 3 px, afastado 2 px) e desativado; campo com rótulo e estado de erro; seletor segmentado; chave liga/desliga; abas numeradas; cartão selecionável; selos; avisos de atenção, erro e informação.
5. Telas, uma por prancha: barra superior com a marca e o seletor de modelo; palco com fundo pontilhado, contorno, linha de sangria tracejada, recorte da câmera e legenda; painel de 400 px com abas e rodapé com a ação principal de cada etapa ("Continuar para imagens", "Continuar para exportar", "Baixar arquivo").
6. Desenho do palco no canvas com as cores do design: alças da seleção em `--color-select` com miolo branco, alça de giro redonda acima da camada, área fora da capa a 28% de opacidade, sangria em `--color-guide`.
7. Celular (abaixo de 900 px): painel vira gaveta inferior com cantos de 20 px e puxador; barra superior compacta; ações da camada selecionada e os botões "Imagem" e "Exportar" na gaveta; erros como aviso flutuante sobre o palco.
8. Marca: "LEONEL" em Fredoka 700 e "GAMES" em Silkscreen. O "O" é o logotipo do leão; enquanto o arquivo oficial não chegar, o círculo com `--brand-gradient` e borda branca, como no design.
9. Textos da interface iguais aos das pranchas (pt-BR), incluindo "Suas imagens não saem deste aparelho".
10. Fica fora: tema claro (o design aprovado é só o escuro) e as imagens de exemplo das pranchas (xadrez roxo e coração pixelado são preenchimento, não vão para o site).

## Locations
- `docs/design/*.dc.html` — pranchas aprovadas (referência, não editar)
- `css/tokens.css` — tokens do passo 2
- `css/app.css` — componentes e layout das telas
- `index.html` — fontes, marca na barra superior, estrutura das abas e da gaveta
- `js/stage.js` — cores e formas das alças, sangria, área esmaecida e legenda do palco
- `js/main.js` — alternância painel lateral / gaveta inferior

## Code references
Os arquivos de código deste item nascem em P-001 a P-004; não há símbolo atual a citar além do que eles substituem:
- `draw` `js/p5.js:33` — render atual do palco, sem nenhum dos elementos visuais do design [code js/p5.js:33-36]
- `setup` `js/p5.js:20` — cria o único controle visual da POC, o botão "Adicione uma imagem" (`js/p5.js:26`) [code js/p5.js:26-28]

## Other references
- Canvas do design: https://claude.ai/artifact/A8UtnR3rUShFE8aGaVRuKT
- P-001 § Strategy 6–8 — casca, tokens provisórios e acessibilidade; este item os leva ao design aprovado. Ordem: depois de P-001 a P-004 (precisa das três abas com conteúdo), antes ou junto de P-005.
- Arte da marca enviada pelo dono em 2026-11-11 (fundo verde, letreiro branco, leão em degradê): origem da paleta. Os consoles da arte são marcas de terceiros e não entram no site.
- Aceitação: `npm test` e `npm run check` passam; `/wh:qa-visual` compara cada tela com a prancha correspondente em 1440×900 e em 390×844: mesmas cores (valores dos tokens), fontes, ordem e textos dos elementos; contraste AA em todo texto; navegação por teclado com foco visível; nenhum alvo de toque menor que 44 px.

- Elementos pedidos depois da aprovação do design e ausentes das pranchas: botões desfazer/refazer (P-007), "Novo projeto" e aviso "Rascunho restaurado" (P-008), margem de segurança no palco (P-003) e campo "Pedido ou cliente" na aba Exportar (P-004). Seguem os componentes de `Sistema.dc.html`; não exigem prancha nova.

## Open questions
- O arquivo oficial do logotipo da Leonel Games (o leão, de preferência em SVG ou PNG com fundo transparente) será fornecido? Sem ele, fica o círculo em degradê. → Não agora: círculo em degradê, com um único ponto de troca (owner, 2026-11-11)
- Carregar as fontes do Google Fonts (depende de rede) ou hospedar os arquivos no próprio repositório? Este item assume Google Fonts. → Google Fonts, por `<link>` (owner, 2026-11-11)
