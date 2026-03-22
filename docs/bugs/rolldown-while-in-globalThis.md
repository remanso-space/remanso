# Rolldown minifier drops `while(` keyword — invalid syntax in Safari

**Status:** To be filed
**Workaround applied:** `build: { minify: "esbuild" }` in `vite.config.mts`

## Summary

Rolldown's minifier drops the `while(`/`for(;` keyword when a `while (x in globalThis)` loop is bundled alongside other module-level variable declarations. The resulting output is a syntax error that crashes Safari.

## Target repositories

- https://github.com/rolldown/rolldown/issues
- https://github.com/oxc-project/oxc/issues (underlying minifier)

## Environment

| Package | Version |
|---|---|
| `vite` | 8.0.1 |
| `rolldown` | 1.0.0-rc.10 |
| `@oxc-project/types` | 0.120.0 |
| Triggered by | `@ark/schema` 0.56.0 / `arktype` 2.1.29 |

## Source

File: `node_modules/@ark/schema/out/shared/registry.js`

```js
let _registryName = "$ark";
let suffix = 2;
while (_registryName in globalThis)
    _registryName = `$ark${suffix++}`;
export const registryName = _registryName;
```

## Actual minified output

```js
un=Pe(`implementedTraits`),dn=`$ark`,fn=2;dn in globalThis;)dn=`$ark${fn++}`;var pn=dn;
```

The `while(` keyword is missing. The orphaned `)` is a syntax error.

## Expected output

```js
var dn=`$ark`,fn=2;for(;dn in globalThis;)dn=`$ark${fn++}`;var pn=dn;
```

## Impact

Safari throws: `SyntaxError: Unexpected keyword 'in'. Expected a ';' following a return statement.`
Chrome and Firefox appear to tolerate the malformed output.

## Reproduction attempts

Direct Rolldown calls (even with the full `arktype` + `@better-fetch/fetch` bundle) do **not** reproduce the bug. It only manifests through Vite's full production build pipeline. This strongly suggests the issue is in the interaction between **Vite's module preprocessing** (dependency pre-bundling, plugin transforms, scope-flattening of ESM modules) and Rolldown's minifier `sequences` optimization pass.

Hypothesis: Vite's pipeline produces a flattened scope where multiple `var` declarations from different original modules are consecutive. When the `sequences` optimizer then tries to fold those `var` declarations into the `for` loop init, it incorrectly drops the `for(var ` prefix when the loop condition contains the `in` operator.

## Notes

- Related closed issue: [rolldown/rolldown#8146](https://github.com/rolldown/rolldown/issues/8146) — "Minifier incorrectly merges statements into for-in expression via comma operator"
- To reproduce: run `pnpm build` in this project **without** `build.minify: "esbuild"` — the broken chunk is `getAuthor-*.js`

## Workaround

Add to `vite.config.mts`:

```ts
build: {
  minify: "esbuild",
},
```

esbuild correctly outputs `for(;Dt in globalThis;)Dt=\`$ark${za++}\``.
