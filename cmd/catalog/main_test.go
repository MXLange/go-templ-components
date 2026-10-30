package main

import (
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
)

func TestCatalogRoutes(t *testing.T) {
	for _, tc := range []struct {
		path   string
		status int
		text   string
	}{
		{"/", 200, "Componentes para construir."},
		{"/?page=2", 200, "PRJ-0005"},
		{"/?page=999", 200, "página 3 de 3"},
		{"/?page=invalid", 200, "página 1 de 3"},
		{"/static/catalog.css", 200, ".catalog-css-example"},
		{"/static/catalog.js", 200, "applyTheme"},
		{"/assets/ui.css", 200, "@layer gtc"},
		{"/assets/ui.js", 200, "window.GTC"},
		{"/healthz", 204, ""},
		{"/missing", 404, "404"},
	} {
		t.Run(tc.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			catalogHandler().ServeHTTP(response, httptest.NewRequest("GET", tc.path, nil))
			if response.Code != tc.status || !strings.Contains(response.Body.String(), tc.text) {
				t.Fatalf("Resposta inesperada: status %d; esperado texto %q", response.Code, tc.text)
			}
		})
	}
}

func TestDemoFormValidationAndEscaping(t *testing.T) {
	for _, name := range []string{"", "<script>alert(1)</script>"} {
		values := url.Values{"name": {name}, "email": {"equipe@exemplo.com"}}
		request := httptest.NewRequest("POST", "/demo/form", strings.NewReader(values.Encode()))
		request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		response := httptest.NewRecorder()
		catalogHandler().ServeHTTP(response, request)
		if response.Code != 200 {
			t.Fatal(response.Code)
		}
		expected := "Formulário recebido"
		if name == "" {
			expected = "Informe o nome do projeto."
		}
		if !strings.Contains(response.Body.String(), expected) || strings.Contains(response.Body.String(), name) && name != "" {
			t.Fatal("Validação ou escape do formulário incorreto")
		}
	}
}

func TestFullAndPartialCatalogResponses(t *testing.T) {
	for _, tc := range []struct {
		target string
		status int
	}{
		{"", 200}, {"partial-projects", 200}, {"unknown", 400},
	} {
		t.Run(tc.target, func(t *testing.T) {
			request := httptest.NewRequest("GET", "/?page=2&partialPage=4", nil)
			request.Header.Set("X-GTC-Partial", tc.target)
			response := httptest.NewRecorder()
			catalogHandler().ServeHTTP(response, request)
			if response.Code != tc.status || !strings.Contains(response.Header().Get("Vary"), "X-GTC-Partial") {
				t.Fatalf("Resposta inesperada: status %d, headers %v", response.Code, response.Header())
			}
			if tc.status != 200 {
				return
			}
			body := response.Body.String()
			if !strings.Contains(response.Header().Get("Content-Type"), "text/html") || !strings.Contains(body, "página 4 de 5") || !strings.Contains(body, "PRJ-0013") {
				t.Fatal("Resposta sem o conteúdo esperado da página 4")
			}
			fullPage := strings.Contains(body, "<!doctype html>")
			if fullPage != (tc.target == "") {
				t.Fatal("Resposta não respeitou o modo completo ou parcial")
			}
			if tc.target != "" && (strings.Contains(body, `id="partial-projects"`) || strings.Contains(body, "/assets/ui.js")) {
				t.Fatal("Fragmento inclui o container externo ou assets do layout")
			}
		})
	}
}
