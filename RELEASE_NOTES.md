# go-templ-components v0.1.0

Primeira versão da biblioteca de componentes Go + Templ.

- Componentes para formulários, conteúdo, navegação e dashboards.
- CSS personalizável em `@layer gtc`, com temas light e dark e duas densidades.
- JavaScript nativo e assets embarcados com `go:embed`.
- Navegação completa e atualização parcial optativa, com histórico por região.
- Mensagens configuráveis por contexto e instância; traduções pt-BR e inglês.
- Sidebar móvel com diálogo nativo, backdrop, Escape e retorno de foco.
- Catálogo com exemplos de todos os componentes e integração dinâmica.
- Testes Go com race detector; Playwright e axe-core nos três navegadores.
- Licença MIT para o código; fontes IBM Plex com licença própria.

```sh
go get github.com/MXLange/go-templ-components@v0.1.0
```

Para executar o catálogo:

```sh
go run ./cmd/catalog
```

O projeto requer Go 1.27.2 ou superior. Node é necessário apenas para os testes de navegador.
