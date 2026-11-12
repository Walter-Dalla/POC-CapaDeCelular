# POC-CapaDeCelular

Estúdio de capas da Leonel Games: site estático para montar a arte de uma capa de celular (Modelo → Imagens → Exportar) e baixar o arquivo de impressão no tamanho físico, com o DPI nos metadados. Tudo roda no navegador; o estado é em milímetros.

## Onde fica cada coisa

- `index.html`: página única (casca, abas, palco, gaveta do celular); CSP por `<meta>`, sem estilo inline.
- `js/main.js`: raiz de composição. `boot()` monta o `ctx` (estado, catálogo, imagens, palco, abas, avisos, rascunho) e os painéis.
- `js/state.js`, `js/history.js`: estado único com desfazer/refazer; só `state.js` escreve no estado.
- `js/geometry.js`, `js/render.js`, `js/layers.js`: medidas, desenho compartilhado (palco e exportação) e operações de camada, incluindo recorte.
- `js/stage.js`, `js/gestures.js`, `js/controls.js`: visões do palco, gestos (arrasto, alças, pinça, teclado, modo de recorte) e atalhos de desfazer.
- `js/panels/{model,images,export}.js`: os três painéis.
- `js/catalog.js` + `data/models.json`: catálogo de modelos (único `fetch` do site).
- `js/images.js`, `js/draft.js`: registro de imagens e rascunho automático no IndexedDB (`capa-studio`).
- `js/export.js`, `js/png-dpi.js`, `js/export-name.js`: geração do arquivo, metadados de DPI e nome.
- `css/tokens.css` (cores, raios, espaços: nenhum literal fora dele), `css/app.css` (componentes), `css/layout.css` (casca), `css/panel-*.css`.
- `tests/*.test.js`: `node:test`, um arquivo por assunto; só funções puras e texto de CSS/HTML.
- `scripts/build-site.sh` e `.github/workflows/pages.yml`: pasta `_site/` e deploy no GitHub Pages.

## Build e teste

Sem build e sem dependências. `npm test` (suíte) e `npm run check` (sintaxe de `js/` e `tests/`), Node 22+. Para rodar: `python3 -m http.server 8000` na raiz e abrir `http://localhost:8000/`. Push em `main` publica pelo workflow (jobs `check` e `deploy`).

## Docs

- `README.md`: rodar, testar, publicar, editar o catálogo.
- `docs/design/*.dc.html`: pranchas aprovadas do design (referência; não editar).
- `docs/pending/`: itens em aberto do dono; `docs/reports/`: relatórios das execuções.
- `.claude/profile/`: perfil do harness.
