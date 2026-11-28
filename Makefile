# Basalisk v2: a Surface app (bin/basalisk). Surface's modules come from hollis-labs/surface;
# Basalisk's own modules, if any, live in modules/.
SURFACE := go tool surface
APP     := cmd/basalisk/surface.yaml

.PHONY: build generate binary test vet typecheck scan

# The page and the binary: bin/basalisk.
build: node_modules
	$(SURFACE) build -f $(APP)

# Regenerate the wiring after editing cmd/basalisk/surface.yaml.
generate:
	$(SURFACE) generate -f $(APP)

# The binary only, with whatever page was last built.
binary: generate
	go build -o bin/basalisk ./cmd/basalisk

node_modules: package-lock.json
	npm ci
	@touch node_modules

test:
	go test -race ./...

vet:
	go vet ./...

typecheck: node_modules
	npx tsc --noEmit -p tsconfig.json

scan:
	python3 scripts/scan-public --ref HEAD
