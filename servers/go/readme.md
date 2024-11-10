# `aloy/servers/go`

This is a simple implementation written in Go.

### Dev

```sh
cp .env.example .env
make dev
```

### Prod

```sh
cp .env.example .env
make build
./server
```

| Command              | Explanation                 |
| -------------------- | --------------------------- |
| `make dev`           | Run the development server  |
| `make test`          | Run the tests               |
| `make test-coverage` | Run the tests with coverage |
| `make build`         | Build the project           |

### Requirements

- [go](https://go.dev/)
- [air](https://github.com/air-verse/air) (optional)
