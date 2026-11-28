import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { surfacePage } from "@hollis-labs/surface-page/vite"
import { defineConfig } from "vite"

// `go tool surface build -f cmd/basalisk/surface.yaml` runs this with SURFACE_APP (picks
// src/generated/<app>.ts, written by `surface generate`) and SURFACE_OUT (the app's webui/dist,
// which the binary embeds).
const app = process.env.SURFACE_APP ?? "basalisk"
const root = import.meta.dirname
const generated = resolve(root, `src/generated/${app}.ts`)
if (!existsSync(generated)) {
  throw new Error(`no ${generated}: run \`make generate\` first`)
}
const outDir = process.env.SURFACE_OUT ?? resolve(root, `../cmd/${app}/webui/dist`)
const api = process.env.SURFACE_API ?? "http://127.0.0.1:8190"

export default defineConfig({
  root,
  base: "/",
  plugins: [
    tailwindcss(),
    surfacePage(),
    {
      // emptyOutDir removes dist/.gitkeep, which the Go embed needs to compile when unbuilt.
      name: "keep-gitkeep",
      closeBundle() {
        mkdirSync(outDir, { recursive: true })
        writeFileSync(resolve(outDir, ".gitkeep"), "")
      },
    },
  ],
  resolve: {
    alias: { "@": resolve(root, "src"), "@surface/app": generated },
  },
  build: { outDir, emptyOutDir: true, chunkSizeWarningLimit: 6000 },
  server: {
    fs: { allow: [resolve(root, "..")] },
    proxy: { "/api": { target: api, ws: true }, "/mcp": api },
  },
})
