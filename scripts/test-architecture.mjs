import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve('scripts/check-architecture.mjs')
const directory = mkdtempSync(resolve(tmpdir(), 'talk-coach-boundaries-'))
const write = (name, content) => {
  const file = resolve(directory, name)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}
const check = () =>
  spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' })
try {
  write(
    'apps/web/src/features/drills/domain/drill.ts',
    'export type Drill = { transcript: string }',
  )
  write(
    'apps/web/src/features/drills/ports/store.ts',
    "import type { Result } from '@talk-coach/result'; import type { Drill } from '../domain/drill'; export type Store = { list(): Result<Drill[], never> }",
  )
  assert.equal(check().status, 0, 'Valid inward imports must pass')
  const violations = [
    [
      'apps/web/src/features/drills/domain/invalid.ts',
      "import { ref } from 'vue'",
      'Core code depends only',
    ],
    [
      'apps/web/src/features/drills/domain/browser.ts',
      'export const size = window.innerWidth',
      'browser global',
    ],
    [
      'apps/web/src/features/drills/domain/outward.ts',
      "import '../application/service'",
      'Domain cannot depend',
    ],
    [
      'apps/web/src/features/drills/ui/invalid.vue',
      "<script setup>import '../adapters/storage'</script>",
      'Feature UI receives',
    ],
    [
      'apps/web/src/features/settings/ui/private.ts',
      "import '../../drills/domain/drill'",
      'Use another feature public index',
    ],
    [
      'packages/ui/src/invalid.ts',
      "import '../../../apps/web/src/features/drills/domain/drill'",
      'UI package cannot depend',
    ],
    [
      'packages/composables/src/ui.ts',
      "import '@talk-coach/ui'",
      'Composables depend only',
    ],
    [
      'packages/composables/src/app.ts',
      "import '../../../apps/web/src/features/drills/domain/drill'",
      'Composables depend only',
    ],
    [
      'apps/web/src/features/drills/domain/composables.ts',
      "import '@talk-coach/composables'",
      'Core code depends only',
    ],
  ]
  for (const [file, source, message] of violations) {
    write(file, source)
    const result = check()
    assert.equal(result.status, 1, `Must reject ${file}`)
    assert.ok(
      result.stderr.includes(message),
      `Must explain ${file}: ${result.stderr}`,
    )
    rmSync(resolve(directory, file))
  }
  console.log(
    'Architecture gate rejected all nine forbidden imports and globals',
  )
} finally {
  rmSync(directory, { recursive: true, force: true })
}
