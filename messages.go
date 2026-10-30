package ui

import (
	"cmp"
	"context"
)

// Messages contém os textos e nomes acessíveis fornecidos pela biblioteca.
// Campos vazios preservam o valor do contexto ou o padrão pt-BR.
type Messages struct {
	DialogClose        string
	TabsLabel          string
	TableLabel         string
	SidebarLabel       string
	SidebarClose       string
	BreadcrumbLabel    string
	PaginationLabel    string
	PaginationFirst    string
	PaginationPrevious string
	PaginationNext     string
	PaginationLast     string
	ToastLabel         string
	ToastClose         string
	PartialError       string
}

// PTBRMessages retorna uma cópia das mensagens padrão em português brasileiro.
func PTBRMessages() Messages {
	return Messages{
		DialogClose: "Fechar diálogo", TabsLabel: "Abas", TableLabel: "Tabela",
		SidebarLabel: "Navegação lateral", SidebarClose: "Fechar navegação",
		BreadcrumbLabel: "Caminho de navegação", PaginationLabel: "Paginação",
		PaginationFirst: "Primeira página", PaginationPrevious: "Página anterior",
		PaginationNext: "Próxima página", PaginationLast: "Última página",
		ToastLabel: "Notificações", ToastClose: "Dispensar notificação",
		PartialError: "Não foi possível carregar o conteúdo. Tente novamente.",
	}
}

// EnglishMessages retorna uma cópia das mensagens em inglês.
func EnglishMessages() Messages {
	return Messages{
		DialogClose: "Close dialog", TabsLabel: "Tabs", TableLabel: "Table",
		SidebarLabel: "Sidebar navigation", SidebarClose: "Close navigation",
		BreadcrumbLabel: "Breadcrumb", PaginationLabel: "Pagination",
		PaginationFirst: "First page", PaginationPrevious: "Previous page",
		PaginationNext: "Next page", PaginationLast: "Last page",
		ToastLabel: "Notifications", ToastClose: "Dismiss notification",
		PartialError: "Unable to load the content. Please try again.",
	}
}

type messagesKey struct{}

// WithMessages aplica mensagens ao contexto, sem alterar outras requisições.
func WithMessages(ctx context.Context, messages Messages) context.Context {
	return context.WithValue(ctx, messagesKey{}, mergeMessages(resolveMessages(ctx, nil), messages))
}

func resolveMessages(ctx context.Context, local *Messages) Messages {
	messages, ok := ctx.Value(messagesKey{}).(Messages)
	if !ok {
		messages = PTBRMessages()
	}
	if local != nil {
		messages = mergeMessages(messages, *local)
	}
	return messages
}

func mergeMessages(base, override Messages) Messages {
	return Messages{
		DialogClose:        cmp.Or(override.DialogClose, base.DialogClose),
		TabsLabel:          cmp.Or(override.TabsLabel, base.TabsLabel),
		TableLabel:         cmp.Or(override.TableLabel, base.TableLabel),
		SidebarLabel:       cmp.Or(override.SidebarLabel, base.SidebarLabel),
		SidebarClose:       cmp.Or(override.SidebarClose, base.SidebarClose),
		BreadcrumbLabel:    cmp.Or(override.BreadcrumbLabel, base.BreadcrumbLabel),
		PaginationLabel:    cmp.Or(override.PaginationLabel, base.PaginationLabel),
		PaginationFirst:    cmp.Or(override.PaginationFirst, base.PaginationFirst),
		PaginationPrevious: cmp.Or(override.PaginationPrevious, base.PaginationPrevious),
		PaginationNext:     cmp.Or(override.PaginationNext, base.PaginationNext),
		PaginationLast:     cmp.Or(override.PaginationLast, base.PaginationLast),
		ToastLabel:         cmp.Or(override.ToastLabel, base.ToastLabel),
		ToastClose:         cmp.Or(override.ToastClose, base.ToastClose),
		PartialError:       cmp.Or(override.PartialError, base.PartialError),
	}
}
