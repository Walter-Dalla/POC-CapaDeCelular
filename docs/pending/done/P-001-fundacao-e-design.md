---
id: P-001
status: done
created: 2026-11-11
related: [P-002, P-003, P-004, P-005, P-006, P-007, P-008]
---

# Trocar o sketch p5 por um app estático em módulos, com o novo layout e o sistema de design

## Problem
A POC é um sketch p5 de um arquivo (`js/p5.js`): canvas fixo de 400×800, uma única imagem, uma única moldura (`phone.png`), sem escala, sem exportação e sem design (um botão solto abaixo do canvas). As imagens vêm por URL absoluta do GitHub Pages, então o que roda localmente não é o que está no disco. O arrasto recentraliza a imagem no mouse (ela "pula") e só funciona com mouse.

Pedido do dono: "quero um site em que eu consiga selecionar o meu modelo de celular, selecione uma ou mais imagens para fazer um recorte e consiga extrair o arquivo em um formato de imagem para enviar a uma impressora […] o projeto é uma poc agora quero melhorar ela, incluindo o design".

Este item entrega a base em que P-002 a P-005 se apoiam: estrutura de arquivos, estado, casca visual e tokens de design. Não entrega ainda catálogo, edição nem exportação.

## Strategy
1. Continuar **sem build e sem dependências de runtime**: HTML + CSS + JavaScript em ES modules, Canvas 2D nativo. p5.js sai (o app precisa de transformações por camada, gestos de toque e render fora da tela em alta resolução; p5 não ajuda em nenhum dos três e pesa ~1 MB).
   - Alternativa descartada: Vite + framework. Daria componentes, mas exige build e pipeline para um app de uma tela; o deploy no GitHub Pages fica mais simples servindo os arquivos como estão.
2. Criar `package.json` mínimo, sem dependências: `"type": "module"`, `"private": true`, scripts `test` (`node --test`) e `check` (`node --check` em cada `js/**/*.js`; o `node --check` confere um arquivo por chamada, então o script percorre os arquivos: `find js tests -name "*.js" -print0 | xargs -0 -n1 node --check`, que sai 0 com tudo certo e 123 com erro de sintaxe [medido em Node 22.23.2]). Serve só para os checks; o site não precisa de `npm install`.
3. Estrutura:
   - `index.html` — casca da página; um `<script type="module" src="js/main.js">`.
   - `css/tokens.css` — tokens de design; `css/app.css` — layout e componentes.
   - `js/main.js` — inicialização e ligação entre estado, palco e painéis.
   - `js/state.js` — estado do projeto (`modelId`, `layers`, `selectedLayerId`, `background`) com `getState`, `update` e `subscribe`. Único lugar que muda o estado.
   - `js/geometry.js` — funções puras: conversão mm↔px, contorno arredondado, composição de transformações. Sem DOM, testável em Node.
   - `tests/` — testes `node --test` dos módulos puros.
   - Os demais módulos (`catalog.js`, `stage.js`, `layers.js`, `export.js`, `png-dpi.js`) nascem nos itens que os usam.
4. Regra de unidade, válida para todos os itens: **o estado guarda medidas em milímetros**, com origem no centro da capa. Pixels só existem no render (tela ou exportação). É o que permite exportar em qualquer DPI sem perda.
5. Todos os caminhos relativos (`./js/…`, `./data/…`): o site é servido em `/POC-CapaDeCelular/`. Nenhuma URL absoluta do GitHub Pages no código.
6. Layout "estúdio", em português:
   - Barra superior: nome do produto e o modelo escolhido.
   - Palco central: a capa grande, centralizada, sobre fundo neutro, redimensionando com a janela.
   - Painel com três abas, na ordem do fluxo: **Modelo · Imagens · Exportar**. Lateral direito a partir de 900 px de largura; gaveta inferior abaixo disso.
   - Neste item as abas existem com estados vazios; o conteúdo vem de P-002, P-003 e P-004.
7. Sistema de design em `css/tokens.css`: cores de superfície, texto, borda e um acento; escala de espaçamento, raios, sombras, tipografia (pilha de fontes do sistema, sem fonte externa); tema claro e escuro por `prefers-color-scheme`. Componentes base em `css/app.css`: botão (primário, secundário, ícone), campo, aba, cartão, aviso.
8. Acessibilidade mínima: foco visível, contraste AA, alvos de toque ≥ 44 px, `label` em todo controle, abas navegáveis por teclado.
9. Remover `js/p5.js` e a tag da CDN. `phone.png`, `mike.png` e `route.json` ficam para P-005.

## Locations
- `index.html:5` — sai a CDN do p5 [code index.html:5]
- `index.html:7` — sai `js/p5.js`; entra `js/main.js` como módulo [code index.html:7]
- `index.html:9-13` — `<body>` com o `<main>` vazio (`index.html:10-12`) vira a casca (barra, palco, painel com abas) [code index.html:9-13]
- `index.css` — removido; entram `css/tokens.css` e `css/app.css`. Hoje o arquivo nem é carregado: `index.html` não tem `<link rel="stylesheet">` [code index.html:4-8]
- `js/p5.js` — removido [code js/p5.js:1-75, o arquivo inteiro]
- `package.json` (novo), `js/main.js` (novo), `js/state.js` (novo), `js/geometry.js` (novo), `tests/geometry.test.js` (novo)

## Code references
Sem `.codegraph/` no repo; linhas conferidas com `grep -n`.
- `configs` `js/p5.js:2` — estado global atual (posição de uma imagem); substituído por `js/state.js` [code js/p5.js:2-12]
- `preload` `js/p5.js:14` — carrega as imagens por URL absoluta (`js/p5.js:16-17`); removido [code js/p5.js:14-18]
- `setup` `js/p5.js:20` — canvas fixo 400×800 (`js/p5.js:21`) e botão de upload (`js/p5.js:26-28`); removido [code js/p5.js:20-31]
- `draw` `js/p5.js:33` — desenha imagem e moldura a cada quadro; o render novo é sob demanda (quando o estado muda) [code js/p5.js:33-51]
- `mouseDragged` `js/p5.js:53` — arrasto que recentraliza no mouse; substituído em P-003 [code js/p5.js:53-60]
- `loadUserImage` `js/p5.js:63`, `handleUserImageLoad` `js/p5.js:69` — upload de uma imagem; substituídos em P-003 [code js/p5.js:63-75]

## Other references
- Design de referência (canvas "Leonel Games — Estúdio de Capas"): https://claude.ai/artifact/A8UtnR3rUShFE8aGaVRuKT — cinco pranchas: Modelo, Imagens, Exportar, celular (gaveta inferior) e tokens/componentes. É a fonte dos tokens de `css/tokens.css` e do layout dos passos 6 e 7; onde este item e o design divergirem, vale o design. Tema escuro (verde) é o principal; o tema claro do passo 7 deixa de ser exigido. Fontes: Fredoka (títulos), Nunito Sans (texto), Silkscreen (rótulos), via Google Fonts, no lugar da pilha do sistema.
- `CLAUDE.md` — mapa atual do repo; fica desatualizado depois deste item.
- `.claude/profile/implementation.md` § Commands — `typecheck: node --check js/p5.js` deixa de valer; passa a ser `npm run check`, e a suíte `npm test`. O perfil é arquivo protegido: o dono autorizou a primeira raia desta tarefa a trocar as duas chaves de § Commands (`suite: npm test`, `typecheck: npm run check`) (owner, 2026-11-11).
- Aceitação: `npm test` e `npm run check` passam; a página abre por `python3 -m http.server` sem erro no console, com a casca e as três abas, em 1280 px e em 390 px de largura, nos temas claro e escuro.

## Open questions
- Nome do produto na barra superior? → Marca da contratante, "Leonel Games", com o subtítulo "Estúdio de capas" (owner, 2026-11-11)
- Cor de acento da marca? → Paleta tirada da arte da Leonel Games: base verde-petróleo `#24564C`, texto branco, ação principal `#FFB52E`, seleção `#FF5CA8`; tokens completos na prancha "Tokens e componentes" do design (owner, 2026-11-11)
- O logotipo oficial da Leonel Games (arquivo do leão) será fornecido? No design, um círculo com o degradê da marca ocupa o lugar dele. → Não agora: fica o círculo em degradê, com um único ponto de troca (`.brand__mark`) (owner, 2026-11-11)
