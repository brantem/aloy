# `aloy/servers`

To prepare the servers, run `make prepare`. This will create a `servers/data.db` file that will be used by all servers except `servers/cloudflare-workers`.

### Requirements

- [sqlite3](https://www.sqlite.org/)

### Docs

There is an `openapi.yml` file, and a `.bruno` folder that can be used with [Bruno](https://www.usebruno.com/) to view a list of all endpoints.
