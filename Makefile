.PHONY: catalog generate check test browser-test

catalog:
	go run ./cmd/catalog

generate:
	go generate ./...

check:
	go tool templ generate -check
	go vet ./...
	go test ./...

test:
	go test -race ./...

browser-test:
	npm test
