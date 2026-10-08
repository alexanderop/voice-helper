import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, dirname } from 'node:path'
import { spawnSync } from 'node:child_process'

const checker = resolve('scripts/check-architecture.mjs')
const directory = mkdtempSync(resolve(tmpdir(), 'starter-boundaries-'))
const write = (name, content) => {
  const file = resolve(directory, name)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, content)
}
const check = () =>
  spawnSync(process.execPath, [checker], { cwd: directory, encoding: 'utf8' })
try {
  write(
    'apps/playground/src/features/notes/domain/note.ts',
    'export type Note = { title: string }',
  )
  write(
    'apps/playground/src/features/notes/ports/store.ts',
    "import type { Result } from '@starter/result'; import type { Note } from '../domain/note'; export type Store = { list(): Result<Note[], never> }",
  )
  assert.equal(check().status, 0, 'Valid inward imports must pass')
  const violations = [
    [
      'apps/playground/src/features/notes/domain/invalid.ts',
      "import { ref } from 'vue'",
      'Core code depends only',
    ],
    [
      'apps/playground/src/features/notes/domain/browser.ts',
      'export const size = window.innerWidth',
      'browser global',
    ],
    [
      'apps/playground/src/features/notes/domain/outward.ts',
      "import '../application/service'",
      'Domain cannot depend',
    ],
    [
      'apps/playground/src/features/notes/ui/invalid.vue',
      "<script setup>import '../adapters/storage'</script>",
      'Feature UI receives',
    ],
    [
      'apps/playground/src/features/settings/ui/private.ts',
      "import '../../notes/domain/note'",
      'Use another feature public index',
    ],
    [
      'packages/ui/src/invalid.ts',
      "import '../../../apps/playground/src/features/notes/domain/note'",
      'UI package cannot depend',
    ],
    [
      'packages/composables/src/ui.ts',
      "import '@starter/ui'",
      'Composables depend only',
    ],
    [
      'packages/composables/src/app.ts',
      "import '../../../apps/playground/src/features/notes/domain/note'",
      'Composables depend only',
    ],
    [
      'apps/playground/src/features/notes/domain/composables.ts',
      "import '@starter/composables'",
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
