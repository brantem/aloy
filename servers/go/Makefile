test:
	go test ./...

test-coverage:
	go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out

dev:
	@command -v air > /dev/null && air || go run .

build:
	go build -o server -ldflags="-s -w" github.com/brantem/aloy
