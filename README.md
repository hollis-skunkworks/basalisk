# Basalisk

Basalisk v2 is a [Surface](https://github.com/hollis-labs/surface) app on
[Substrate](https://github.com/hollis-labs/substrate). It is the testing ground where Surface modules in
development run together: notes, files, terminal, agent chat, the Interaction Builder, the Agent Workbench and
the rest (`cmd/basalisk/surface.yaml`).

Basalisk v1 (Substrate only) is archived as `hollis-skunkworks/basalisk-v1`.

## Build and run

Needs Go 1.26.11+ and Node 22+.

```sh
make build        # generate the wiring, build the page, build bin/basalisk
./bin/basalisk    # serves http://127.0.0.1:8190
```

Data lives under `$XDG_DATA_HOME/surface/basalisk`, or `BASALISK_DATA_DIR`. The address is `BASALISK_ADDR`.

## How it is put together

- `cmd/basalisk/surface.yaml` lists the modules. `make generate` writes the Go wiring and
  `web/src/generated/basalisk.ts`.
- Surface's modules arrive as `@surface/modules/<id>` and are resolved by `surfacePage()` from the Surface Go
  module this repository requires. Basalisk-only modules go in `modules/<id>/`.
- The page draws with the Surface registry components in `web/src/components/ui`.

## Releases and deploys

`build.yml` builds on the build runner on push to `main` (Substrate `go-app-build`). `deploy.yaml` lets
`fleet-install deploy basalisk --target linux-basalisk` install the binary and restart it through Cerberus.
