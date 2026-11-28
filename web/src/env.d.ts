declare module "@surface/app" {
  import type { ModuleWeb } from "@hollis-labs/surface-page/sdk"
  export const app: { name: string; title: string }
  export const modules: Record<string, ModuleWeb>
}

// Surface's modules, resolved by surfacePage() from the Surface Go module (see vite.config.ts).
declare module "@surface/modules/*" {
  import type { ModuleWeb } from "@hollis-labs/surface-page/sdk"
  const web: ModuleWeb
  export default web
}
