# `aloy/servers/cloudflare-workers`

This is a simple implementation written in TypeScript for Cloudflare Workers.

### Dev

```sh
cp wrangler.example wrangler
npx wrangler d1 migrations apply aloy --local
pnpm dev
```

### Deploy

```sh
cp wrangler.example wrangler
npx wrangler d1 create aloy
# Update DATABASE_ID in wrangler.toml
npx wrangler d1 migrations apply aloy --remote
pnpm deploy
```

| Command              | Explanation                 |
| -------------------- | --------------------------- |
| `pnpm dev`           | Run the development server  |
| `pnpm test`          | Run the tests               |
| `pnpm test-coverage` | Run the tests with coverage |
| `pnpm build`         | Build the project           |

### Requirements

- [go](https://go.dev/)
- [air](https://github.com/air-verse/air) (optional)
