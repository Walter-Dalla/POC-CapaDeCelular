---
id: P-008
status: open
created: 2026-11-11
related: [P-001, P-002, P-003, P-007]
---

# Salvar o rascunho automaticamente no navegador e restaurá-lo ao reabrir

## Problem
Tudo vive na memória da página: recarregar, fechar a aba por engano ou o navegador do celular descartar a aba em segundo plano perde o modelo escolhido, as imagens e o posicionamento. Para o atendente da loja com o cliente esperando, isso significa recomeçar. O dono pediu que entre agora (2026-11-11).

## Strategy
1. `js/draft.js`: guarda **um** rascunho no IndexedDB do navegador (banco `capa-studio`, armazéns `draft` e `images`).
   - `draft`: o estado serializável — `modelId`, modelo personalizado, cor de fundo, opções de exportação e, por camada, `id`, `name`, `cx`, `cy`, `width`, `rotation`, `imageId`.
   - `images`: o arquivo original de cada imagem (`Blob`), por `imageId`. Guardar o arquivo, não os pixels decodificados: é menor e não perde qualidade. Camadas duplicadas compartilham o mesmo `imageId`.
   - Alternativa descartada: `localStorage`. Só aceita texto e tem limite de cerca de 5 MB; uma foto já estoura.
2. Salvamento automático: 500 ms depois da última mudança de estado (e ao esconder a página, `visibilitychange`). Imagens entram no armazém quando são adicionadas; saem quando nenhuma camada nem o histórico (P-007) as usa mais.
3. Ao abrir a página com rascunho salvo: restaurar direto e mostrar um aviso discreto, "Rascunho restaurado", com a ação "Começar do zero". Sem pergunta bloqueante.
4. "Novo projeto" na barra superior: limpa o palco e o rascunho, com confirmação quando há camadas.
5. Falhas não quebram o editor: sem IndexedDB (navegação privada em alguns navegadores) ou com cota estourada, o app funciona sem salvar e mostra uma vez o aviso "Não foi possível salvar o rascunho neste navegador".
6. Aviso ao sair (`beforeunload`) só quando há mudança ainda não gravada no rascunho.
7. Versão do formato (`version: 1`) no rascunho; rascunho de versão desconhecida ou com imagem faltando é descartado, sem erro para o usuário.
8. Privacidade: o rascunho fica só neste navegador; nada é enviado. O texto "Suas imagens não saem deste aparelho" continua verdadeiro.
9. Fora do escopo: vários projetos salvos, exportar/importar arquivo de projeto e sincronizar entre aparelhos.

## Locations
- `js/draft.js` (novo) — leitura, gravação e limpeza do rascunho
- `js/state.js` — serializar e restaurar o estado; gancho para o salvamento automático
- `js/layers.js` — `imageId` por camada; guardar o arquivo original ao adicionar
- `js/main.js` — restaurar ao iniciar, aviso "Rascunho restaurado", "Novo projeto", `beforeunload`
- `index.html`, `css/app.css` — ação "Novo projeto" e os avisos
- `tests/draft.test.js` (novo) — serialização e restauração do estado (funções puras; o IndexedDB em si fica para o QA visual)

## Code references
Os arquivos deste item nascem em P-001 e P-003; do código atual só existe o que eles substituem:
- `handleUserImageLoad` `js/p5.js:69` — recebe o arquivo do usuário e guarda só a imagem decodificada, em memória (`js/p5.js:72`)
- `configs` `js/p5.js:2` — estado em memória, perdido ao recarregar

## Other references
- P-003 § Strategy 8 — listava "salvar o projeto entre sessões" como fora do escopo; passa a valer este item.
- P-006 — os avisos usam os componentes de aviso de `docs/design/Sistema.dc.html`; "Novo projeto" é um botão secundário, que não está nas pranchas.
- Aceitação: `npm test` passa; `/wh:qa-visual`: montar uma capa com duas imagens, recarregar a página e ver a mesma composição (modelo, posições, giro, ordem, cor de fundo); "Começar do zero" esvazia o palco e, depois de recarregar, o palco continua vazio.

## Open questions
- O rascunho deve expirar sozinho (ex.: depois de 7 dias)? Num computador de balcão, a arte de um cliente fica guardada até alguém começar outra. Este item assume que não expira e que "Novo projeto" é o jeito de limpar.
