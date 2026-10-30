// Package assets distribui os estilos e comportamentos dos componentes.
package assets

import (
	"embed"
	"net/http"
)

//go:embed ui.css ui.js
var files embed.FS

// Handler serve ui.css e ui.js. Use http.StripPrefix ao montar em um prefixo.
func Handler() http.Handler {
	server := http.FileServerFS(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/ui.css" && r.URL.Path != "/ui.js" {
			http.NotFound(w, r)
			return
		}
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-cache")
		server.ServeHTTP(w, r)
	})
}
