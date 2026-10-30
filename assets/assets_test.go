package assets_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/MXLange/go-templ-components/assets"
)

func TestAssetsMountAndHTTP(t *testing.T) {
	mux := http.NewServeMux()
	mux.Handle("/custom/ui/", http.StripPrefix("/custom/ui", assets.Handler()))
	for _, tc := range []struct {
		method, path, contentType string
		status                    int
	}{
		{"GET", "/custom/ui/ui.css", "text/css", 200},
		{"GET", "/custom/ui/ui.js", "javascript", 200},
		{"HEAD", "/custom/ui/ui.css", "text/css", 200},
		{"GET", "/custom/ui/", "", 404},
		{"GET", "/custom/ui/assets.go", "", 404},
		{"POST", "/custom/ui/ui.css", "", 405},
	} {
		t.Run(tc.method+tc.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, httptest.NewRequest(tc.method, tc.path, nil))
			if response.Code != tc.status {
				t.Fatalf("Status = %d; esperado %d", response.Code, tc.status)
			}
			if !strings.Contains(response.Header().Get("Content-Type"), tc.contentType) {
				t.Errorf("Content-Type = %q", response.Header().Get("Content-Type"))
			}
			if tc.method == "HEAD" && response.Body.Len() != 0 {
				t.Error("HEAD retornou conteúdo")
			}
			if tc.status == 200 && response.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Error("Header nosniff ausente")
			}
		})
	}
}

func TestIncludeNormalizesPrefix(t *testing.T) {
	var output bytes.Buffer
	if err := assets.Include("/custom/ui/").Render(t.Context(), &output); err != nil {
		t.Fatal(err)
	}
	for _, expected := range []string{`href="/custom/ui/ui.css"`, `src="/custom/ui/ui.js"`, `defer`} {
		if !strings.Contains(output.String(), expected) {
			t.Errorf("HTML sem %s: %s", expected, output.String())
		}
	}
}
