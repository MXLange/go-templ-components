package ui_test

import (
	"bytes"
	"context"
	"reflect"
	"strconv"
	"strings"
	"testing"

	ui "github.com/MXLange/go-templ-components"
	"github.com/a-h/templ"
)

func renderContext(t *testing.T, ctx context.Context, component templ.Component) string {
	t.Helper()
	var output bytes.Buffer
	if err := component.Render(ctx, &output); err != nil {
		t.Fatal(err)
	}
	return output.String()
}

func TestMessageDictionariesAreCompleteAndIndependent(t *testing.T) {
	pt := reflect.ValueOf(ui.PTBRMessages())
	en := reflect.ValueOf(ui.EnglishMessages())
	for i := range pt.NumField() {
		if pt.Field(i).String() == "" || en.Field(i).String() == "" {
			t.Errorf("Tradução ausente: %s", pt.Type().Field(i).Name)
		}
	}
	modified := ui.EnglishMessages()
	modified.PaginationFirst = "Changed"
	if ui.EnglishMessages().PaginationFirst == modified.PaginationFirst {
		t.Fatal("Dicionário global foi alterado")
	}
}

func TestMessagePrecedence(t *testing.T) {
	ctx := ui.WithMessages(t.Context(), ui.EnglishMessages())
	ctx = ui.WithMessages(ctx, ui.Messages{PaginationLast: "Context last"})
	local := ui.Messages{PaginationFirst: "Local first"}
	output := renderContext(t, ctx, ui.Pagination(ui.PaginationProps{
		BaseProps: ui.BaseProps{Messages: &local}, Label: "Explicit label",
	}))
	requireContains(t, output, `aria-label="Explicit label"`, `aria-label="Local first"`,
		`aria-label="Previous page"`, `aria-label="Next page"`, `aria-label="Context last"`)
	if strings.Contains(output, "Primeira página") {
		t.Fatal("O padrão pt-BR substituiu uma mensagem configurada")
	}
	output = renderContext(t, ctx, ui.Dialog(ui.DialogProps{BaseProps: ui.BaseProps{Messages: new(ui.Messages{DialogClose: "Local close"})}, CloseLabel: "Explicit close"}))
	requireContains(t, output, `aria-label="Explicit close"`)
	output = renderContext(t, t.Context(), ui.Pagination(ui.PaginationProps{BaseProps: ui.BaseProps{Messages: &ui.Messages{PaginationNext: "Continue"}}}))
	requireContains(t, output, `aria-label="Primeira página"`, `aria-label="Continue"`)
}

func TestContextMessagesCoverComponentsAndRuntime(t *testing.T) {
	ctx := ui.WithMessages(t.Context(), ui.EnglishMessages())
	for _, tc := range []struct {
		component templ.Component
		fragments []string
	}{
		{ui.Dialog(ui.DialogProps{}), []string{`aria-label="Close dialog"`}},
		{ui.Tabs(ui.TabsProps{}), []string{`aria-label="Tabs"`}},
		{ui.Table(ui.TableProps{}), []string{`aria-label="Table"`}},
		{ui.Sidebar(ui.SidebarProps{MobileModal: true}), []string{`aria-label="Sidebar navigation"`, `data-gtc-sidebar-close-label="Close navigation"`, `data-gtc-mobile-modal="true"`}},
		{ui.Breadcrumb(ui.BreadcrumbProps{}), []string{`aria-label="Breadcrumb"`}},
		{ui.Toast(ui.ToastProps{}), []string{`aria-label="Notifications"`, `data-gtc-toast-close-label="Dismiss notification"`}},
		{ui.Link(ui.LinkProps{Partial: &ui.PartialProps{TargetID: "items"}}), []string{`data-gtc-request-error-message="Unable to load the content. Please try again."`}},
	} {
		requireContains(t, renderContext(t, ctx, tc.component), tc.fragments...)
	}
}

func TestMessagesAreIsolatedBetweenConcurrentRequests(t *testing.T) {
	for i := range 32 {
		t.Run(strconv.Itoa(i), func(t *testing.T) {
			t.Parallel()
			messages := ui.PTBRMessages()
			if i%2 == 0 {
				messages = ui.EnglishMessages()
			}
			ctx := ui.WithMessages(t.Context(), messages)
			output := renderContext(t, ctx, ui.Pagination(ui.PaginationProps{}))
			requireContains(t, output, `aria-label="`+messages.PaginationFirst+`"`)
		})
	}
}
