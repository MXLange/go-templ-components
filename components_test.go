package ui_test

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	ui "github.com/MXLange/go-templ-components"
	"github.com/a-h/templ"
	"golang.org/x/net/html"
)

func render(t *testing.T, component templ.Component, text string) string {
	t.Helper()
	ctx := templ.WithChildren(t.Context(), templ.ComponentFunc(func(_ context.Context, w io.Writer) error {
		_, err := io.WriteString(w, templ.EscapeString(text))
		return err
	}))
	var out bytes.Buffer
	if err := component.Render(ctx, &out); err != nil {
		t.Fatal(err)
	}
	return out.String()
}

func requireContains(t *testing.T, output string, fragments ...string) {
	t.Helper()
	for _, fragment := range fragments {
		if !strings.Contains(output, fragment) {
			t.Errorf("HTML sem %q: %s", fragment, output)
		}
	}
}

func TestButtonCompositionAndAttributePrecedence(t *testing.T) {
	p := ui.ButtonProps{
		BaseProps: ui.BaseProps{ID: "save", Class: "checkout", Attributes: templ.Attributes{
			"class": "extra", "type": "reset", "disabled": false, "data-project": "portal", "id": "wrong",
		}},
		Type: "submit", Loading: true,
	}
	output := render(t, ui.Button(p), "<Salvar>")
	requireContains(t, output, `id="save"`, `type="submit"`, `disabled`, `aria-busy="true"`,
		`gtc-button extra checkout`, `data-project="portal"`, `&lt;Salvar&gt;`)
	if strings.Contains(output, `type="reset"`) || strings.Contains(output, `id="wrong"`) {
		t.Fatal("Atributos adicionais substituíram propriedades tipadas")
	}
}

func TestFieldLabelsAndErrors(t *testing.T) {
	output := render(t, ui.Input(ui.InputProps{
		FieldProps: ui.FieldProps{BaseProps: ui.BaseProps{ID: "email", Attributes: templ.Attributes{"aria-describedby": "external"}},
			Label: "E-mail", Name: "email", Description: "Use o e-mail da equipe.", Error: "E-mail inválido.", Required: true},
		Type: "email", Value: `"/><script>alert(1)</script>`,
	}), "")
	requireContains(t, output, `for="email"`, `id="email"`, `type="email"`, `name="email"`, `required`,
		`aria-invalid="true"`, `aria-describedby="external email-description email-error"`,
		`id="email-description"`, `id="email-error"`)
	if strings.Contains(output, "<script>") {
		t.Fatal("Valor do input não foi escapado")
	}
}

func TestNativeFormControls(t *testing.T) {
	t.Run("textarea", func(t *testing.T) {
		output := render(t, ui.Textarea(ui.TextareaProps{FieldProps: ui.FieldProps{Label: "Descrição"}, Value: "</textarea><script>"}), "")
		requireContains(t, output, `rows="3"`, `&lt;/textarea&gt;&lt;script&gt;`)
	})
	t.Run("checkbox", func(t *testing.T) {
		output := render(t, ui.Checkbox(ui.CheckboxProps{FieldProps: ui.FieldProps{Label: "Ativo", Disabled: true}, Checked: true}), "")
		requireContains(t, output, `type="checkbox"`, `checked`, `disabled`, `value="on"`)
	})
	t.Run("select", func(t *testing.T) {
		output := render(t, ui.Select(ui.SelectProps{FieldProps: ui.FieldProps{Label: "Ambiente"}, Value: "prod",
			Options: []ui.SelectOption{{Value: "dev", Label: "Dev"}, {Value: "prod", Label: "Prod", Disabled: true}}}), "")
		requireContains(t, output, `value="prod" selected disabled`)
	})
}

func TestGeneratedIDsAndHTMLAttributesAreUnique(t *testing.T) {
	components := []templ.Component{
		ui.Input(ui.InputProps{}), ui.Input(ui.InputProps{}), ui.Textarea(ui.TextareaProps{}),
		ui.Select(ui.SelectProps{}), ui.Checkbox(ui.CheckboxProps{}), ui.Dropdown(ui.DropdownProps{}),
		ui.Tabs(ui.TabsProps{Items: []ui.TabItem{{Label: "A"}, {Label: "B"}}}), ui.Dialog(ui.DialogProps{}),
	}
	var source strings.Builder
	for _, component := range components {
		source.WriteString(render(t, component, ""))
	}
	tokens := html.NewTokenizer(strings.NewReader(source.String()))
	ids := make(map[string]bool)
	for {
		typeOf := tokens.Next()
		if typeOf == html.ErrorToken {
			if tokens.Err() != io.EOF {
				t.Fatal(tokens.Err())
			}
			break
		}
		if typeOf != html.StartTagToken && typeOf != html.SelfClosingTagToken {
			continue
		}
		token := tokens.Token()
		seen := make(map[string]bool)
		for _, attr := range token.Attr {
			if seen[attr.Key] {
				t.Errorf("Atributo duplicado: %s em %s", attr.Key, token.Data)
			}
			seen[attr.Key] = true
			if attr.Key == "id" {
				if ids[attr.Val] {
					t.Errorf("ID duplicado: %s", attr.Val)
				}
				ids[attr.Val] = true
			}
		}
	}
}

func TestTabsSkipDisabledSelection(t *testing.T) {
	output := render(t, ui.Tabs(ui.TabsProps{BaseProps: ui.BaseProps{ID: "tabs"}, Selected: 0,
		Items: []ui.TabItem{{Label: "A", Disabled: true}, {Label: "B"}}}), "")
	requireContains(t, output, `id="tabs-tab-1" aria-controls="tabs-panel-1" aria-selected="true" tabindex="0"`)
	output = render(t, ui.Tabs(ui.TabsProps{Items: []ui.TabItem{{Label: "A", Disabled: true}}}), "")
	if strings.Contains(output, `aria-selected="true"`) {
		t.Fatal("Aba desabilitada foi selecionada")
	}
}

func TestUnsafeLinksAreSanitized(t *testing.T) {
	components := []templ.Component{
		ui.DropdownItem(ui.DropdownItemProps{Href: "javascript:alert(1)"}),
		ui.Breadcrumb(ui.BreadcrumbProps{Items: []ui.NavItem{{Label: "Link", Href: "javascript:alert(1)"}}}),
		ui.Pagination(ui.PaginationProps{Items: []ui.NavItem{{Label: "1", Href: "javascript:alert(1)"}}}),
	}
	for _, component := range components {
		output := render(t, component, "Link")
		if strings.Contains(output, `href="javascript:`) {
			t.Fatal("URL insegura foi renderizada")
		}
	}
}

func TestSurfaceComposition(t *testing.T) {
	for name, component := range map[string]templ.Component{
		"card": ui.Card(ui.CardProps{Title: "Projeto"}), "badge": ui.Badge(ui.BadgeProps{Tone: ui.ToneSuccess}),
		"alert": ui.Alert(ui.AlertProps{Title: "Atenção"}), "sidebar": ui.Sidebar(ui.SidebarProps{}),
		"table": ui.Table(ui.TableProps{Caption: "Projetos", Loading: true}),
	} {
		t.Run(name, func(t *testing.T) { requireContains(t, render(t, component, "Conteúdo"), "Conteúdo") })
	}
}

func TestPartialConfiguration(t *testing.T) {
	plain := render(t, ui.Link(ui.LinkProps{Href: "/projects?page=2"}), "Próxima")
	if strings.Contains(plain, "data-gtc-partial") {
		t.Fatal("Link sem configuração ativou atualização parcial")
	}
	for _, component := range []templ.Component{
		ui.Link(ui.LinkProps{Href: "/projects?page=2", Partial: &ui.PartialProps{TargetID: "projects"}}),
		ui.Pagination(ui.PaginationProps{Partial: &ui.PartialProps{TargetID: "projects"}}),
	} {
		requireContains(t, render(t, component, "Próxima"), `data-gtc-partial="projects"`, `data-gtc-history="false"`)
	}
	output := render(t, ui.Link(ui.LinkProps{Href: "javascript:alert(1)", Partial: &ui.PartialProps{TargetID: "projects", History: true}}), "Abrir")
	requireContains(t, output, `data-gtc-history="true"`)
	if strings.Contains(output, `href="javascript:`) {
		t.Fatal("Link parcial renderizou URL insegura")
	}
}
