---
id: P-009
status: open
created: 2026-11-12
related: [P-005]
---

# Trocar a fonte do GitHub Pages para "GitHub Actions"

## Problem
O workflow `.github/workflows/pages.yml` (P-005) publica o site pelo job `deploy`, mas o Pages do repositório ainda está no modo antigo (branch `main`, raiz). Enquanto a fonte não for trocada, o job `deploy` falha e o Pages continua publicando a raiz inteira do branch, com `docs/`, `tests/` e `CLAUDE.md`.

## Strategy
1. No GitHub: Settings → Pages → Build and deployment → Source → "GitHub Actions". Só o dono do repositório consegue.
2. Depois do merge do PR em `main`, conferir na aba Actions que `check` e `deploy` passam e abrir `https://walter-dalla.github.io/POC-CapaDeCelular/`.

## Locations
- `.github/workflows/pages.yml` — workflow que depende da troca
- `README.md` — já descreve o passo

## Code references
—

## Other references
- Relatório da execução: `docs/reports/2026-11-12-estudio-capas.md`

## Open questions
—
