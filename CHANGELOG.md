# Histórico de alterações

## 0.1.0 — 2026-10-30

- Componentes Go + Templ para formulários, conteúdo, navegação e dashboards.
- Assets embarcados com `go:embed` e handler compatível com `net/http`.
- CSS em `@layer gtc`, com tokens e classes públicas para personalização.
- Temas light e dark; densidades compact e comfortable.
- JavaScript nativo com inicialização idempotente e suporte a conteúdo dinâmico.
- `Link` e `Pagination` com atualização parcial optativa, histórico e cancelamento de requisições por região.
- Contrato HTTP para fragmentos Templ com `X-GTC-Partial` e `Vary`.
- Webserver de exemplos em `cmd/catalog`.
- Testes Go, Playwright e axe-core.
- Mensagens configuráveis por contexto e instância, com dicionários pt-BR e inglês.
- Sidebar móvel optativa com diálogo nativo, backdrop, Escape e gerenciamento de foco.
- Exemplos de inserção, remoção, eventos delegados e atualização parcial de componentes.
- Matriz de testes em Chromium, Firefox e WebKit.
- Licença MIT para o código; licença IBM Plex preservada para as fontes.
- Publicação de releases vinculada aos testes da tag.

Instalação: `go get github.com/MXLange/go-templ-components@v0.1.0`.
