# @talk-coach/result

A vendored copy of [better-result](https://github.com/dmmulroy/better-result) by [Dillon Mulroy](https://github.com/dmmulroy), released under the MIT license in [LICENSE](LICENSE). Read the [better-result documentation](https://better-result.dev) for the API.

| Upstream | Value                                      |
| -------- | ------------------------------------------ |
| Version  | 3.0.1                                      |
| Commit   | `4a654fa6dacb8bf75a6283772bba0c81afcfa64a` |

`src/` matches upstream except for one patch that lets it compile under this repository's `erasableSyntaxOnly` and `exactOptionalPropertyTypes` flags: `Ok` and `Err` assign `value` and `error` in the constructor body instead of using parameter properties, and optional `issues` and `signal` properties also accept `undefined`. Runtime behavior is unchanged. The Vitest and fast-check tests are unchanged. Prettier and Oxlint skip `src/` so a later update stays close to a plain copy. `pnpm test:unit` runs its runtime tests and `src/*.test-d.ts` type tests; `pnpm typecheck` checks it with `tsconfig.json` in this folder.

## Update

1. Clone `https://github.com/dmmulroy/better-result` and check out the release tag.
2. Replace `src/` and `LICENSE` with the upstream files, then reapply the compiler-flag patch above if upstream has not adopted it.
3. Update the version and commit above, and `version` in `package.json`.
4. Run `pnpm typecheck && pnpm test:unit`.
