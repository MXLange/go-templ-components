package ui

import (
	"cmp"
	"fmt"
	"maps"
	"strings"
	"sync/atomic"

	"github.com/a-h/templ"
)

// BaseProps permite estender o elemento principal de cada componente.
// Props tipadas prevalecem sobre Attributes. Class adiciona classes ao elemento.
type BaseProps struct {
	ID         string
	Class      string
	Attributes templ.Attributes
	Messages   *Messages
}

type ButtonVariant string

const (
	ButtonPrimary   ButtonVariant = "primary"
	ButtonSecondary ButtonVariant = "secondary"
	ButtonGhost     ButtonVariant = "ghost"
)

type Size string

const (
	SizeSmall  Size = "sm"
	SizeMedium Size = "md"
	SizeLarge  Size = "lg"
)

type Tone string

const (
	ToneNeutral Tone = "neutral"
	ToneSuccess Tone = "success"
	ToneWarning Tone = "warning"
	ToneError   Tone = "error"
)

type ButtonProps struct {
	BaseProps
	Variant  ButtonVariant
	Size     Size
	Type     string
	Disabled bool
	Loading  bool
}

// FieldProps associa rótulo, ajuda e erro ao controle.
type FieldProps struct {
	BaseProps
	Name        string
	Label       string
	Description string
	Error       string
	Disabled    bool
	Required    bool
}

type InputProps struct {
	FieldProps
	Type         string
	Value        string
	Placeholder  string
	Autocomplete string
}

type TextareaProps struct {
	FieldProps
	Value       string
	Placeholder string
	Rows        int
}

type CheckboxProps struct {
	FieldProps
	Checked bool
	Value   string
}

type SelectOption struct {
	Value    string
	Label    string
	Disabled bool
}

type SelectProps struct {
	FieldProps
	Value   string
	Options []SelectOption
}

type CardProps struct {
	BaseProps
	Title       string
	Description string
}

type BadgeProps struct {
	BaseProps
	Tone Tone
}

type AlertProps struct {
	BaseProps
	Tone  Tone
	Title string
}

type DialogProps struct {
	BaseProps
	Title      string
	CloseLabel string
}

type DialogTriggerProps struct {
	ButtonProps
	Target string
}

type DropdownProps struct {
	BaseProps
	Label    string
	Disabled bool
}

type DropdownItemProps struct {
	BaseProps
	Href     string
	Value    string
	Disabled bool
}

type TabItem struct {
	Label    string
	Content  templ.Component
	Disabled bool
}

type TabsProps struct {
	BaseProps
	Label    string
	Items    []TabItem
	Selected int
}

type TableProps struct {
	BaseProps
	Caption string
	Loading bool
}

type TableCellProps struct {
	BaseProps
	Numeric bool
}

type SidebarProps struct {
	BaseProps
	Label       string
	Collapsed   bool
	MobileModal bool
}

type SidebarToggleProps struct {
	ButtonProps
	Target string
}

type NavItem struct {
	Label   string
	Href    string
	Current bool
}

type BreadcrumbProps struct {
	BaseProps
	Label string
	Items []NavItem
}

// PartialProps ativa GET de um fragmento HTML para o conteúdo de TargetID.
// History permite integrar a atualização com a URL e o histórico do navegador.
type PartialProps struct {
	TargetID string
	History  bool
}

type LinkProps struct {
	BaseProps
	Href    string
	Partial *PartialProps
}

type PaginationProps struct {
	BaseProps
	Label        string
	Items        []NavItem
	FirstHref    string
	PreviousHref string
	NextHref     string
	LastHref     string
	Partial      *PartialProps
}

func partialAttributes(p *PartialProps) templ.Attributes {
	a := make(templ.Attributes)
	if p != nil && p.TargetID != "" {
		a["data-gtc-partial"] = p.TargetID
		a["data-gtc-history"] = fmt.Sprint(p.History)
	}
	return a
}

type ToastProps struct {
	BaseProps
	Label string
}

var sequence atomic.Uint64

func componentID(id string) string {
	if id != "" {
		return id
	}
	return fmt.Sprintf("gtc-%d", sequence.Add(1))
}

func attributes(p BaseProps, class string, owned templ.Attributes) templ.Attributes {
	a := maps.Clone(p.Attributes)
	if a == nil {
		a = make(templ.Attributes)
	}
	if p.ID != "" {
		a["id"] = p.ID
	}
	if extra, ok := a["class"].(string); ok {
		class += " " + extra
	}
	a["class"] = strings.TrimSpace(class + " " + p.Class)
	maps.Copy(a, owned)
	return a
}

func fieldAttributes(p FieldProps, id, class string, extra templ.Attributes) templ.Attributes {
	a := attributes(p.BaseProps, "gtc-control "+class, templ.Attributes{
		"id": id, "name": p.Name, "disabled": p.Disabled, "required": p.Required,
	})
	if p.Error != "" {
		a["aria-invalid"] = "true"
	}
	var descriptions []string
	if existing, ok := a["aria-describedby"].(string); ok && existing != "" {
		descriptions = append(descriptions, existing)
	}
	if p.Description != "" {
		descriptions = append(descriptions, id+"-description")
	}
	if p.Error != "" {
		descriptions = append(descriptions, id+"-error")
	}
	if len(descriptions) > 0 {
		a["aria-describedby"] = strings.Join(descriptions, " ")
	}
	maps.Copy(a, extra)
	return a
}

func buttonAttributes(p ButtonProps, extra templ.Attributes) templ.Attributes {
	a := attributes(p.BaseProps, "gtc-button", templ.Attributes{
		"type": cmp.Or(p.Type, "button"), "disabled": p.Disabled || p.Loading,
		"data-gtc-variant": string(cmp.Or(p.Variant, ButtonPrimary)),
		"data-gtc-size":    string(cmp.Or(p.Size, SizeMedium)),
		"aria-busy":        fmt.Sprint(p.Loading),
	})
	maps.Copy(a, extra)
	return a
}

func selectedTab(p TabsProps) int {
	if p.Selected >= 0 && p.Selected < len(p.Items) && !p.Items[p.Selected].Disabled {
		return p.Selected
	}
	for i, item := range p.Items {
		if !item.Disabled {
			return i
		}
	}
	return -1
}
