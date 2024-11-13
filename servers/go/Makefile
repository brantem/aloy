test:
	go test ./...

test-coverage:
	go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out

dev:
	@if command -v air > /dev/null; then DEBUG=1 air; else DEBUG=1 go run .; fi

build:
	go build -o server -ldflags="-s -w" github.com/brantem/aloy
