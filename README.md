# go-templ-components

Biblioteca de componentes para Go + Templ. Inclui CSS personalizável e interações com JavaScript nativo.

O módulo usa o caminho `github.com/MXLange/go-templ-components`. A versão inicial preparada é `v0.1.0`.

## Executar o catálogo

Requisito: Go 1.27.2 ou superior.

```sh
go run ./cmd/catalog
```

Acesse [http://127.0.0.1:8080](http://127.0.0.1:8080).

O webserver contém exemplos de todos os componentes, código Templ, temas, densidades e overrides de CSS.
Na seção “O CSS é seu”, edite o CSS no navegador para testar alterações imediatamente.
O botão “Restaurar CSS” recupera o exemplo original. As edições não alteram arquivos do projeto.
Também demonstra formulário, paginação no servidor e estados de carregamento, vazio e erro.
O exemplo “Atualização parcial” usa cinco páginas, mantém o documento aberto e integra o histórico do navegador.

Para alterar o endereço:

```sh
go run ./cmd/catalog -addr 0.0.0.0:8080
```

## Usar em outro projeto

Após publicar o módulo, instale com:

```sh
go get github.com/MXLange/go-templ-components
```

Durante o desenvolvimento local, use um `replace` no projeto consumidor:

```sh
go mod edit -replace github.com/MXLange/go-templ-components=/caminho/para/go-templ-components
go get github.com/MXLange/go-templ-components
```

Registre os assets no servidor:

```go
import (
    "net/http"

    "github.com/MXLange/go-templ-components/assets"
)

mux := http.NewServeMux()
mux.Handle("GET /ui/", http.StripPrefix("/ui", assets.Handler()))
```

Carregue os assets uma vez no layout. Depois, carregue o CSS do projeto:

```templ
package pages

import ui "github.com/MXLange/go-templ-components"
import "github.com/MXLange/go-templ-components/assets"

templ Page() {
    <!DOCTYPE html>
    <html lang="pt-BR" data-gtc-theme="light" data-gtc-density="comfortable">
        <head>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1"/>
            <title>Meu projeto</title>
            @assets.Include("/ui")
            <link rel="stylesheet" href="/static/app.css"/>
        </head>
        <body>
            <main>
                @ui.Button(ui.ButtonProps{Variant: ui.ButtonPrimary}) {
                    Salvar
                }
            </main>
            @ui.Toast(ui.ToastProps{})
        </body>
    </html>
}
```

Os arquivos `_templ.go` da biblioteca já estão versionados. O consumidor gera apenas seus próprios arquivos Templ.
Use Templ `v0.3.1100` para manter o gerador e o runtime compatíveis.

A biblioteca não exige npm, Tailwind, HTMX ou Alpine no projeto consumidor.

## Componentes

| Grupo | Componentes |
| --- | --- |
| Formulários | `Button`, `Input`, `Textarea`, `Checkbox`, `Select` |
| Conteúdo | `Card`, `Badge`, `Alert` |
| Interações | `Dialog`, `DialogTrigger`, `Dropdown`, `DropdownItem`, `Tabs` |
| Dados | `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeader`, `TableCell`, `Pagination` |
| Navegação | `Link`, `Sidebar`, `SidebarToggle`, `Breadcrumb` |
| Notificações | `Toast` |

Cada componente aceita uma struct `Props`. `BaseProps` fornece `ID`, `Class` e `Attributes`.
Os controles de formulário usam `FieldProps`, que também fornece `Label`, `Description`, `Error`, `Name`, `Required` e `Disabled`.

```templ
@ui.Input(ui.InputProps{
    FieldProps: ui.FieldProps{
        BaseProps: ui.BaseProps{ID: "email"},
        Label: "E-mail",
        Name: "email",
        Required: true,
        Description: "Use o e-mail da equipe.",
    },
    Type: "email",
    Autocomplete: "email",
})
```

As propriedades tipadas prevalecem sobre atributos adicionais conflitantes. Classes adicionais são mescladas.
Use `Attributes` para `data-*`, `aria-*`, `hx-*`, `autocomplete` e outras integrações.
O Templ preserva seu escape e sua sanitização de atributos.

Dados, filtros, ordenação, validação e paginação pertencem ao projeto consumidor.
O exemplo de e-mail do catálogo usa a validação nativa do navegador durante a digitação.
Quando o valor é válido, o exemplo remove o estado de erro e mostra uma borda verde.
O atributo `data-gtc-valid="true"` ativa o estilo de sucesso. `aria-invalid="true"` mantém prioridade sobre esse estilo.
O projeto consumidor controla esses atributos e a mensagem associada ao campo.
`Pagination` recebe links prontos. `Table` recebe cabeçalho e células compostos com Templ.
`Pagination` centraliza os controles e mostra primeira, anterior, próxima e última página.
Defina `FirstHref`, `PreviousHref`, `NextHref` e `LastHref` com as URLs correspondentes.
Se uma URL estiver vazia, o controle correspondente fica desabilitado e sai da navegação por Tab.
O catálogo demonstra esse fluxo com `?page=1`, `?page=2` e `?page=3`.

`Card.Title` gera um `h3`. Para outra hierarquia, omita `Title` e componha o cabeçalho como conteúdo.
`Select` usa o elemento nativo. Dropdown aceita um único nível de itens.

## Navegação completa e atualização parcial

O modo padrão de `Pagination` e `Link` usa navegação completa.
Para atualizar uma região, informe `Partial`. O campo `TargetID` identifica o elemento que receberá o fragmento.

```templ
<div id="projetos" role="region" aria-label="Projetos">
    @projectsContent(page)
</div>
```

O componente `projectsContent` deve renderizar os dados e a paginação, sem repetir o container `projetos`:

```templ
templ projectsContent(page int) {
    @projectTable(page)
    @ui.Pagination(ui.PaginationProps{
        Items: []ui.NavItem{
            {Label: "1", Href: "/projetos?page=1", Current: page == 1},
            {Label: "2", Href: "/projetos?page=2", Current: page == 2},
        },
        Partial: &ui.PartialProps{
            TargetID: "projetos",
            History: true,
        },
    })
}
```

`FirstHref`, `PreviousHref`, `NextHref` e `LastHref` também usam o modo parcial configurado na paginação.
Para aplicar o mesmo transporte a outro link:

```templ
@ui.Link(ui.LinkProps{
    Href: "/projetos?page=2",
    Partial: &ui.PartialProps{TargetID: "projetos"},
}) {
    Abrir a segunda página
}
```

Sem `Partial`, esse componente renderiza um link comum.
O projeto não precisa escrever um listener ou chamar `fetch` para usar a atualização parcial.

### Contrato HTTP

O JavaScript faz `GET` no `href` com estes headers:

```http
Accept: text/html
X-GTC-Partial: projetos
```

O servidor retorna somente o conteúdo interno da região quando recebe `X-GTC-Partial`.
Sem esse header, a mesma URL retorna a página completa.

Exemplo de handler, considerando `projectsContent` e `projectsPage` definidos pelo projeto:

```go
mux.HandleFunc("GET /projetos", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Add("Vary", "X-GTC-Partial")
    page, _ := strconv.Atoi(r.URL.Query().Get("page"))
    page = max(page, 1)

    if target := r.Header.Get("X-GTC-Partial"); target != "" {
        if target != "projetos" {
            http.Error(w, "Região desconhecida", http.StatusBadRequest)
            return
        }
        templ.Handler(projectsContent(page)).ServeHTTP(w, r)
        return
    }

    templ.Handler(projectsPage(page)).ServeHTTP(w, r)
})
```

Use `Content-Type: text/html`; `templ.Handler` configura esse header.
O fragmento não deve conter `<!doctype>`, `<html>`, `<head>` ou `<body>`.
Carregue os scripts no layout. Scripts incluídos no fragmento não são executados pela atualização.

O catálogo implementa esse contrato em `GET /`, com o destino `partial-projects` e o parâmetro `partialPage`.
Sua paginação completa continua usando `page`.

### Histórico, carregamento e falhas

- `History: false` é o padrão. A atualização mantém a URL atual.
- Com `History: true`, uma resposta bem-sucedida atualiza a URL e cria uma entrada no histórico.
- Voltar e Avançar buscam os fragmentos correspondentes. O estado inicial também pode ser restaurado.
- O runtime guarda URLs por região em `history.state.gtcPartial`. Outras chaves do objeto são preservadas.
- Use a mesma configuração de histórico para os links que atualizam uma região.
- Durante a requisição, a região recebe `aria-busy="true"`.
- Uma nova requisição cancela a anterior da mesma região. Regiões distintas funcionam de forma independente.
- Após a resposta, somente o conteúdo interno muda. O container externo e as demais regiões são preservados.
- O foco passa para a região atualizada com `preventScroll`. As interações dos componentes são inicializadas.
- Em falhas, o conteúdo anterior permanece. Uma mensagem acessível permite identificar o erro e tentar novamente.

O transporte intercepta somente cliques comuns em links locais configurados.
Ctrl/Cmd, clique do meio, download, `target="_blank"` e links externos mantêm o comportamento nativo.
Sem JavaScript ou sem o elemento de destino, o `href` continua abrindo a página completa.

Os atributos equivalentes são `data-gtc-partial="projetos"` e `data-gtc-history="true"`.
O seletor de comportamento não depende das classes CSS do componente.

## Sobrescrever o CSS

Todo CSS da biblioteca fica dentro de `@layer gtc`. CSS comum do consumidor prevalece sem `!important`.
O projeto pode alterar tokens, classes globais ou uma instância específica.

```css
/* app.css: sem @layer. */
:root {
  --gtc-color-primary: #166534;
  --gtc-color-primary-text: #fff;
  --gtc-radius: 0.25rem;
  --gtc-font-family: "Minha Fonte", sans-serif;
}

.gtc-button {
  font-weight: 600;
}

.checkout-submit {
  background: #14532d;
  color: #fff;
  padding-inline: 2rem;
}

.checkout-submit:hover {
  background: #166534;
}

.gtc-tab[aria-selected="true"] {
  background: #dbeafe;
  color: #172554;
}
```

```templ
@ui.Button(ui.ButtonProps{
    BaseProps: ui.BaseProps{Class: "checkout-submit"},
}) {
    Finalizar compra
}
```

Se o projeto também usar layers, declare a ordem antes dos estilos:

```css
@layer gtc, app;

@layer app {
  .gtc-button { border-radius: 0; }
}
```

As classes `gtc-*`, os tokens `--gtc-*` e os estados documentados são contratos públicos.
O JavaScript usa atributos `data-gtc-*`. Substituir classes visuais não altera os seletores de comportamento.
A biblioteca não usa Shadow DOM, reset global, `!important` ou estilos visuais inline.

### Tokens

| Categoria | Tokens |
| --- | --- |
| Cores | `--gtc-color-bg`, `--gtc-color-surface`, `--gtc-color-raised`, `--gtc-color-text`, `--gtc-color-muted` |
| Bordas | `--gtc-color-border`, `--gtc-color-divider` |
| Ação principal | `--gtc-color-primary`, `--gtc-color-primary-text` |
| Estados | `--gtc-color-success`, `--gtc-color-warning`, `--gtc-color-error`, `--gtc-color-overlay` |
| Tipografia | `--gtc-font-family`, `--gtc-font-size` |
| Geometria | `--gtc-radius`, `--gtc-radius-large`, `--gtc-control-height`, `--gtc-control-padding`, `--gtc-cell-padding`, `--gtc-panel-padding` |
| Movimento | `--gtc-duration`, `--gtc-ease` |

Defina overrides de tokens no mesmo elemento que estabelece o tema ou em um descendente.
Um tema definido em um container pode substituir tokens herdados de `:root`.

### Temas e densidade

```html
<html data-gtc-theme="dark" data-gtc-density="compact">
```

- `data-gtc-theme`: `light` ou `dark`. Sem o atributo, a raiz segue `prefers-color-scheme`.
- `data-gtc-density`: `compact` ou `comfortable`. O padrão é `comfortable`.
- É possível definir tema e densidade em containers específicos.

O catálogo persiste as escolhas no `localStorage`. A biblioteca não altera as preferências do projeto.

## JavaScript

`ui.js` expõe `window.GTC`. Os scripts devem carregar na ordem: biblioteca, depois scripts do projeto.
A biblioteca inicializa o documento e observa componentes adicionados ao DOM.

```js
// Inicialização manual opcional e idempotente.
GTC.init(document.getElementById("fragment"));

// Requer uma região @ui.Toast(ui.ToastProps{}).
const id = GTC.toast("Alterações salvas.", {
  tone: "success",
  duration: 0, // Dispensa manual por padrão.
});

GTC.dismissToast(id);
```

`toast` aceita `tone`, `duration` em milissegundos, `region` com o ID da região e `closeLabel`.
Se `duration` for positivo, o temporizador pausa durante foco ou hover.
`toast` trata a mensagem como texto. Se a região não existir, a função retorna um erro JavaScript.

Use IDs explícitos para relacionar `DialogTrigger` com `Dialog` e `SidebarToggle` com `Sidebar`.
IDs omitidos são gerados durante a renderização. Não são estáveis entre requisições.

```templ
@ui.DialogTrigger(ui.DialogTriggerProps{Target: "details"}) { Abrir }
@ui.Dialog(ui.DialogProps{
    BaseProps: ui.BaseProps{ID: "details"},
    Title: "Detalhes",
}) {
    <p>Conteúdo do diálogo.</p>
}
```

Botões com `data-gtc-dialog-close` fecham o diálogo que os contém.
O Dialog mantém o foco, aceita Escape e retorna o foco ao trigger.
Tabs usa setas, Home e End. Dropdown usa setas, Home, End, Escape e Tab.

### Eventos DOM

Todos os eventos usam `bubbles: true`. Os valores ficam em `event.detail`.

| Evento | Elemento emissor | `detail` |
| --- | --- | --- |
| `gtc:dialog-change` | Dialog | `{ open }` |
| `gtc:dropdown-change` | Dropdown | `{ open }` |
| `gtc:dropdown-select` | Dropdown | `{ value }` |
| `gtc:tabs-change` | Tabs | `{ index, id }` |
| `gtc:sidebar-change` | Sidebar | `{ expanded }` |
| `gtc:toast-show` | Região Toast | `{ id, message, tone }` |
| `gtc:toast-dismiss` | Toast individual, antes da remoção | `{ id }` |
| `gtc:request-start` | Região de destino | `{ url, targetID }` |
| `gtc:request-success` | Região de destino | `{ url, targetID, status }` |
| `gtc:request-error` | Região de destino | `{ url, targetID, status, message, error }` |

```js
document.addEventListener("gtc:dropdown-select", event => {
  console.log(event.detail.value);
});
```

Funções Go executam no servidor. Eventos DOM executam no navegador.
Requisições canceladas por outra requisição não emitem `gtc:request-error`.
Falhas de rede usam `status: 0`. `message` contém a mensagem acessível; `error` contém o detalhe técnico.

## Desenvolvimento e testes

```sh
go generate ./...
go test ./...
go vet ./...
go test -race ./...
go tool templ generate -check
```

O `go.mod` fixa o Templ em `v0.3.1100` para o runtime e o gerador `go tool templ`.

Para executar os testes de navegador:

```sh
npm ci
npx playwright install chromium
npm test
```

Playwright inicia o catálogo em `127.0.0.1:18080`. Os testes usam Chromium e axe-core.
Node é necessário apenas para esses testes.

## Compatibilidade e acessibilidade

O alvo são navegadores atuais com cascade layers, OKLCH, `<dialog>`, `inert` e `MutationObserver`.
Os testes automatizados cobrem Chromium, teclado, foco, temas, densidades e layout com 320 pixels.
Também cobrem fragmentos, falhas HTTP, cancelamento, histórico, múltiplas regiões e navegação sem JavaScript.
Os testes axe verificam os critérios automatizáveis de WCAG AA.

Dropdown usa posicionamento absoluto. Containers com `overflow: hidden` podem cortar seu menu.
Não coloque o menu dentro de um container que corte seu conteúdo.

Os controles precisam de rótulos. Após alterar o CSS, verifique contraste, foco e tamanho dos alvos.
A avaliação com leitor de tela permanece uma verificação manual.

As fontes IBM Plex pertencem apenas ao catálogo. Sua licença está em `cmd/catalog/static/IBM-Plex-LICENSE.txt`.
