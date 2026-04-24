declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module "pouchdb-adapter-indexeddb"
declare module "@toycode/markdown-it-class"
declare module "markdown-it-block-embed"
declare module "markdown-it-checkbox"
declare module "markdown-it-regexp"
declare module "markdown-it-iframe"
declare module "@rushstack/eslint-patch/modern-module-resolution"
declare module "pastel-color"
