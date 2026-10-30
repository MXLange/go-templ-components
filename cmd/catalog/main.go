package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	ui "github.com/MXLange/go-templ-components"
	"github.com/MXLange/go-templ-components/assets"
	"github.com/a-h/templ"
)

//go:embed static/*
var static embed.FS

type catalogData struct {
	Page        int
	PartialPage int
	Name        string
	Email       string
	Error       string
	Success     bool
}

func projectPagination(page int) ui.PaginationProps {
	pageURL := func(n int) string { return "/?page=" + strconv.Itoa(n) + "#table" }
	p := ui.PaginationProps{}
	for n := 1; n <= 3; n++ {
		p.Items = append(p.Items, ui.NavItem{Label: strconv.Itoa(n), Href: pageURL(n), Current: n == page})
	}
	if page > 1 {
		p.FirstHref = pageURL(1)
		p.PreviousHref = pageURL(page - 1)
	}
	if page < 3 {
		p.NextHref = pageURL(page + 1)
		p.LastHref = pageURL(3)
	}
	return p
}

func partialProjectURL(page, fullPage int) string {
	return "/?page=" + strconv.Itoa(fullPage) + "&partialPage=" + strconv.Itoa(page) + "#partial-table"
}

func partialProjectPagination(page, fullPage int) ui.PaginationProps {
	p := ui.PaginationProps{Label: "Paginação parcial", Partial: &ui.PartialProps{TargetID: "partial-projects", History: true}}
	start := min(max(page-1, 1), 3)
	for n := start; n < start+3; n++ {
		p.Items = append(p.Items, ui.NavItem{Label: strconv.Itoa(n), Href: partialProjectURL(n, fullPage), Current: n == page})
	}
	if page > 1 {
		p.FirstHref = partialProjectURL(1, fullPage)
		p.PreviousHref = partialProjectURL(page-1, fullPage)
	}
	if page < 5 {
		p.NextHref = partialProjectURL(page+1, fullPage)
		p.LastHref = partialProjectURL(5, fullPage)
	}
	return p
}

func catalogHandler() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("GET /assets/", http.StripPrefix("/assets", assets.Handler()))
	mux.Handle("GET /static/", http.FileServerFS(static))
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Vary", "X-GTC-Partial")
		page, _ := strconv.Atoi(r.URL.Query().Get("page"))
		partialPage, _ := strconv.Atoi(r.URL.Query().Get("partialPage"))
		data := catalogData{Page: min(max(page, 1), 3), PartialPage: min(max(partialPage, 1), 5)}
		if target := r.Header.Get("X-GTC-Partial"); target != "" {
			if target != "partial-projects" {
				http.Error(w, "Região desconhecida", http.StatusBadRequest)
				return
			}
			templ.Handler(partialProjects(data.PartialPage, data.Page)).ServeHTTP(w, r)
			return
		}
		templ.Handler(catalog(data)).ServeHTTP(w, r)
	})
	mux.HandleFunc("POST /demo/form", func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Formulário inválido", http.StatusBadRequest)
			return
		}
		data := catalogData{Page: 1, PartialPage: 1, Name: r.FormValue("name"), Email: r.FormValue("email")}
		if data.Name == "" {
			data.Error = "Informe o nome do projeto."
		} else {
			data.Success = true
		}
		templ.Handler(catalog(data)).ServeHTTP(w, r)
	})
	return mux
}

func main() {
	addr := flag.String("addr", "127.0.0.1:8080", "Endereço do catálogo")
	flag.Parse()
	server := &http.Server{
		Addr: *addr, Handler: catalogHandler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second, WriteTimeout: 15 * time.Second, IdleTimeout: 60 * time.Second,
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			log.Printf("Falha ao encerrar o servidor: %v", err)
		}
	}()
	log.Printf("Catálogo disponível em http://%s", *addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}
