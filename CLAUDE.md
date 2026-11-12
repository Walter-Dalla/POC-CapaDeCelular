# POC-CapaDeCelular

Prova de conceito de personalização de capa de celular: o usuário carrega uma imagem e a arrasta por trás da moldura do celular num canvas p5.js.

## Onde fica cada coisa

- `index.html`: página única; carrega p5.js 1.4.2 da CDN jsdelivr e o sketch `js/p5.js`.
- `js/p5.js`: todo o código (sketch p5: `preload`, `setup`, `draw`, `mouseDragged`, upload da imagem do usuário). Apesar do nome, não é a biblioteca p5.
- `index.css`: reset de margem e canvas em bloco.
- `phone.png` (moldura) e `mike.png` (imagem padrão do usuário): o sketch as carrega pela URL do GitHub Pages (`https://walter-dalla.github.io/POC-CapaDeCelular/`), não pelo caminho local.
- `route.json`: 3 rotas de pontos `{x, y}` (`data[].RoutePoints`); ainda não usado pelo código.
- `README.md`: só o título, codificado em UTF-16 (ler com `iconv -f utf-16`).

## Build e teste

Sem build, sem dependências locais, sem testes, sem CI. Para rodar: servir a raiz por HTTP (ex.: `python3 -m http.server 8000`) e abrir `http://localhost:8000/`. Publicado via GitHub Pages a partir de `main`.

## Docs

Não há docs além deste arquivo e de `.claude/profile/`.
